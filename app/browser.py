"""
AI-Powered Flight Scraper Agent using browser-use and Browser Use Cloud/Local SDK.
Autonomous AI agent that searches airline booking portals (EaseMyTrip / MakeMyTrip / Google Flights)
and extracts structured airfare price quotes for Project CEN (MoSPI Airfare Index).
"""

import asyncio
import os
import json
import logging
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load local environment variables (.env)
load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("BrowserUseFlightAgent")


class FlightQuoteResult(BaseModel):
    airline: str = Field(description="Airline name, e.g. IndiGo, Air India, SpiceJet, Akasa Air")
    flight_number: Optional[str] = Field(None, description="Flight code e.g. 6E-2134, AI-805")
    origin: str = Field(description="3-letter IATA origin airport code e.g. DEL, BOM, BLR")
    destination: str = Field(description="3-letter IATA destination airport code e.g. BOM, BLR, MAA")
    departure_time: Optional[str] = Field(None, description="Departure time e.g. 06:15")
    arrival_time: Optional[str] = Field(None, description="Arrival time e.g. 08:30")
    price_inr: int = Field(description="Total one-way base economy fare in Indian Rupees (INR), e.g. 4850")
    is_non_stop: bool = Field(True, description="True if direct flight without layover")
    source: str = Field("browser-use-agent", description="Scraping source identifier")


class FlightExtractionOutput(BaseModel):
    flights: List[FlightQuoteResult] = Field(default_factory=list, description="List of observed flight quotes")
    total_found: int = Field(0, description="Total flights observed")
    route: str = Field("", description="Route e.g. DEL-BOM")
    departure_date: str = Field("", description="Date in YYYY-MM-DD format")


def check_environment() -> dict:
    """Check and display available browser-use tools and API keys."""
    keys = {
        "BROWSER_USE_API_KEY": bool(os.getenv("BROWSER_USE_API_KEY")),
        "OPENAI_API_KEY": bool(os.getenv("OPENAI_API_KEY")),
        "GEMINI_API_KEY": bool(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")),
        "ANTHROPIC_API_KEY": bool(os.getenv("ANTHROPIC_API_KEY")),
    }
    return keys


async def scrape_flights_with_browser_use(
    origin: str = "DEL",
    destination: str = "BOM",
    departure_date: Optional[str] = None,
) -> FlightExtractionOutput:
    """
    Launches an autonomous Browser Use AI agent to search live flight prices for the given route.
    """
    if not departure_date:
        departure_date = (datetime.utcnow() + timedelta(days=2)).strftime("%Y-%m-%d")

    api_key = os.getenv("BROWSER_USE_API_KEY")

    task_prompt = f"""
    Search for ONE-WAY economy non-stop flights from {origin} to {destination} on departure date {departure_date}.
    Navigate to Google Flights (https://www.google.com/travel/flights) or EaseMyTrip (https://www.easemytrip.com).
    Find and extract up to 10 available flights with airline name, flight number, departure time, arrival time, and price in INR.
    """

    if api_key:
        logger.info("🌐 Using Browser Use Cloud SDK...")
        from browser_use_sdk import AsyncBrowserUse

        async with AsyncBrowserUse(api_key=api_key) as client:
            logger.info(f"🚀 Dispatching autonomous task for {origin}->{destination} on {departure_date}...")
            task_run = await client.run(
                task=task_prompt,
                output_schema=FlightExtractionOutput,
            )
            logger.info(f"✅ Cloud Task Finished! Status: {task_run.status if hasattr(task_run, 'status') else 'Completed'}")
            return task_run
    else:
        logger.info("🖥️ Using Local Browser Use Agent...")
        from browser_use import Agent

        # Check for local LLM keys
        openai_key = os.getenv("OPENAI_API_KEY")
        gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

        llm = None
        if openai_key:
            from langchain_openai import ChatOpenAI
            llm = ChatOpenAI(model="gpt-4o", api_key=openai_key)
        elif gemini_key:
            from langchain_google_genai import ChatGoogleGenerativeAI
            llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=gemini_key)
        
        agent = Agent(
            task=task_prompt,
            llm=llm,
        )
        logger.info("🤖 Starting local browser agent...")
        history = await agent.run()
        logger.info("✅ Local Agent execution finished!")
        return history


async def main():
    origin = "DEL"
    destination = "BOM"
    dep_date = (datetime.utcnow() + timedelta(days=2)).strftime("%Y-%m-%d")

    print("\n" + "="*60)
    print("✈️  PROJECT CEN — BROWSER-USE AIRLINE SCRAPER AGENT")
    print(f"📍 Route: {origin} -> {destination}")
    print(f"📅 Date:  {dep_date}")
    print("="*60)

    # 1. Diagnostic Environment Check
    print("\n🔍 1. Checking Environment & API Keys:")
    env_status = check_environment()
    for key, present in env_status.items():
        status_icon = "✅ Configured" if present else "❌ Not set"
        print(f"   • {key:<22}: {status_icon}")

    if not any(env_status.values()):
        print("\n⚠️  Notice: No AI API key found in your .env file.")
        print("   To run the autonomous agent, add one of the following to your .env file:")
        print("   1) BROWSER_USE_API_KEY=bu_...   (for Browser Use Cloud)")
        print("   2) OPENAI_API_KEY=sk-...        (for GPT-4o Local Agent)")
        print("   3) GEMINI_API_KEY=AIzaSy...     (for Google Gemini Local Agent)")
        print("\n" + "="*60 + "\n")
        return

    # 2. Run Scraping Agent
    print("\n🚀 2. Launching Autonomous Flight Scraper Agent...")
    try:
        result = await scrape_flights_with_browser_use(
            origin=origin,
            destination=destination,
            departure_date=dep_date,
        )
        print("\n" + "="*70)
        print("🎉 SCRAPING COMPLETE! Extracted Live Airline Price Quotes:")
        print("="*70)
        
        flights = []
        if hasattr(result, "output") and hasattr(result.output, "flights"):
            flights = result.output.flights
        elif isinstance(result, dict) and "flights" in result:
            flights = result["flights"]

        if flights:
            print(f"{'Airline':<18} | {'Flight No':<10} | {'Times':<18} | {'Price (INR)':<12} | {'Non-stop'}")
            print("-" * 70)
            for f in flights:
                al = getattr(f, "airline", "") or (f.get("airline", "") if isinstance(f, dict) else "")
                fn = getattr(f, "flight_number", "N/A") or (f.get("flight_number", "N/A") if isinstance(f, dict) else "N/A")
                dep = getattr(f, "departure_time", "") or (f.get("departure_time", "") if isinstance(f, dict) else "")
                arr = getattr(f, "arrival_time", "") or (f.get("arrival_time", "") if isinstance(f, dict) else "")
                times = f"{dep} -> {arr}"
                pr = getattr(f, "price_inr", 0) or (f.get("price_inr", 0) if isinstance(f, dict) else 0)
                ns = "✅ Direct" if (getattr(f, "is_non_stop", True) if not isinstance(f, dict) else f.get("is_non_stop", True)) else "1-stop"
                print(f"{al:<18} | {fn:<10} | {times:<18} | ₹{pr:<11,} | {ns}")
            print("=" * 70)
        else:
            print(result)

    except Exception as err:
        print(f"\n❌ Error running browser agent: {err}")


if __name__ == "__main__":
    asyncio.run(main())