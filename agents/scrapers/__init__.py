from agents.scrapers.social_scraper import scrape_reddit_discussions
from agents.scrapers.tech_scraper import scrape_hackernews, scrape_github_trending
from agents.scrapers.jobs_scraper import scrape_teamtailor_jobs
from agents.scrapers.salary_scraper import scrape_developer_salaries

__all__ = [
    "scrape_reddit_discussions",
    "scrape_hackernews",
    "scrape_github_trending",
    "scrape_teamtailor_jobs",
    "scrape_developer_salaries",
]
