from __future__ import annotations

import re
from typing import Generator

import pytest
from playwright.sync_api import Browser, Page, Playwright, expect, sync_playwright


BASE_URL = "http://127.0.0.1:8000"


@pytest.fixture(scope="session")
def playwright_instance() -> Generator[Playwright, None, None]:
    with sync_playwright() as playwright:
        yield playwright


@pytest.fixture(scope="session")
def browser(playwright_instance: Playwright) -> Generator[Browser, None, None]:
    browser = playwright_instance.chromium.launch(headless=True)
    yield browser
    browser.close()


@pytest.fixture()
def page(browser: Browser) -> Generator[Page, None, None]:
    context = browser.new_context(base_url=BASE_URL)
    page = context.new_page()
    page.goto("/")
    page.evaluate("() => localStorage.clear()")
    page.reload()
    yield page
    context.close()


def add_todo(page: Page, text: str) -> None:
    page.get_by_test_id("todo-input").fill(text)
    page.get_by_test_id("add-button").click()


def test_open_page_and_title(page: Page) -> None:
    expect(page.get_by_test_id("app-title")).to_have_text("Список задач")


def test_add_new_todo(page: Page) -> None:
    add_todo(page, "Прочитать лекцию")
    expect(page.get_by_test_id("todo-list").get_by_test_id("todo-item")).to_have_count(1)
    expect(page.get_by_test_id("todo-text").first).to_have_text("Прочитать лекцию")


def test_toggle_todo_status(page: Page) -> None:
    add_todo(page, "Сделать домашнее задание")

    page.get_by_test_id("toggle-button").first.click()
    expect(page.get_by_test_id("toggle-button").first).to_have_text("Вернуть")
    expect(page.get_by_test_id("todo-item").first).to_have_class(
        re.compile(r".*\bcompleted\b.*")
    )

    page.get_by_test_id("toggle-button").first.click()
    expect(page.get_by_test_id("toggle-button").first).to_have_text("Выполнено")


def test_delete_todo(page: Page) -> None:
    add_todo(page, "Одна задача")
    add_todo(page, "Вторая задача")

    page.get_by_test_id("delete-button").first.click()
    expect(page.get_by_test_id("todo-item")).to_have_count(1)
    expect(page.get_by_test_id("todo-text").first).to_have_text("Вторая задача")


def test_filters_all_active_completed(page: Page) -> None:
    add_todo(page, "Активная задача")
    add_todo(page, "Будет выполненной")
    page.get_by_test_id("toggle-button").nth(1).click()

    page.get_by_test_id("filter-active").click()
    expect(page.get_by_test_id("todo-item")).to_have_count(1)
    expect(page.get_by_test_id("todo-text").first).to_have_text("Активная задача")

    page.get_by_test_id("filter-completed").click()
    expect(page.get_by_test_id("todo-item")).to_have_count(1)
    expect(page.get_by_test_id("todo-text").first).to_have_text("Будет выполненной")

    page.get_by_test_id("filter-all").click()
    expect(page.get_by_test_id("todo-item")).to_have_count(2)


def test_persist_after_reload_via_local_storage(page: Page) -> None:
    add_todo(page, "Сохранится после перезагрузки")
    page.reload()
    expect(page.get_by_test_id("todo-item")).to_have_count(1)
    expect(page.get_by_test_id("todo-text").first).to_have_text("Сохранится после перезагрузки")


def test_drag_and_drop_reorders_tasks(page: Page) -> None:
    add_todo(page, "Первая")
    add_todo(page, "Вторая")
    add_todo(page, "Третья")

    first_item = page.get_by_test_id("todo-item").nth(0)
    third_item = page.get_by_test_id("todo-item").nth(2)
    third_item.drag_to(first_item)

    expect(page.get_by_test_id("todo-text").nth(0)).to_have_text("Третья")
    page.reload()
    expect(page.get_by_test_id("todo-text").nth(0)).to_have_text("Третья")
