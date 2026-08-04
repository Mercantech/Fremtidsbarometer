import asyncio
from patchright.async_api import async_playwright, Browser, BrowserContext
from playwright_stealth import Stealth
import logging

logger = logging.getLogger("ScraperAgent")

class PlaywrightScraper:
    def __init__(self):
        self.playwright = None
        self.browser: Browser = None
        self.context: BrowserContext = None
        self.stealth = Stealth()

    async def start(self):
        """Initialize browser"""
        if not self.playwright:
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(headless=True)
            self.context = await self.browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                viewport={"width": 1920, "height": 1080}
            )

    async def stop(self):
        """Stop browser"""
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()

    async def get_page_text(self, url: str) -> str:
        """Navigates to URL and returns the entire page text, bypassing anti-bot systems."""
        if not self.context:
            await self.start()
            
        page = await self.context.new_page()
        await self.stealth.apply_stealth_async(page)
        
        try:
            logger.info(f"Navigating to {url}")
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            
            # Wait a bit for JS to render the content
            await page.wait_for_timeout(2000)
            
            text = await page.evaluate("document.body.innerText")
            return text or ""
        except Exception as e:
            logger.error(f"Failed to scrape {url}: {e}")
            raise e
        finally:
            await page.close()

    async def get_page_html(self, url: str) -> str:
        """Returns raw HTML of the page for searching links via regex."""
        if not self.context:
            await self.start()
            
        page = await self.context.new_page()
        await self.stealth.apply_stealth_async(page)
        
        try:
            logger.info(f"Navigating to {url} (HTML)")
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(2000)
            return await page.content()
        except Exception as e:
            logger.error(f"Failed to scrape HTML from {url}: {e}")
            raise e
        finally:
            await page.close()
