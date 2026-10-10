from agents.scrapers.social_scraper import scrape_social_discussions
from agents.scrapers.tech_scraper import scrape_hackernews, scrape_github_trending
from agents.scrapers.jobs_scraper import scrape_teamtailor_jobs, scrape_jobs
from agents.scrapers.salary_scraper import scrape_developer_salaries

__all__ = [
    "scrape_social_discussions",
    "scrape_hackernews",
    "scrape_github_trending",
    "scrape_teamtailor_jobs",
    "scrape_jobs",
    "scrape_developer_salaries",
]

