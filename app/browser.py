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
    departure_time: Optional[str] = Field(None, description="Departure time in 24hr or 12hr format e.g. 06:15")
    arrival_time: Optional[str] = Field(None, description="Arrival time e.g. 08:30")
    price_inr: int = Field(description="Total one-way base economy fare in Indian Rupees (INR), e.g. 4850")
    is_non_stop: bool = Field(True, description="True if direct flight without layover")
    source: str = Field("browser-use-agent", description="Scraping source identifier")


class FlightExtractionOutput(BaseModel):
    flights: List[FlightQuoteResult] = Field(default_factory=list, description="List of observed flight quotes")
    total_found: int = Field(0, description="Total flights observed")
    route: str = Field("", description="Route e.g. DEL-BOM")
    departure_date: str = Field("", description="Date in YYYY-MM-DD format")


async def scrape_flights_with_browser_use(
    origin: str = "DEL",
    destination: str = "BOM",
    departure_date: Optional[str] = None,
    timeout_minutes: int = 15,
) -> FlightExtractionOutput:
    """
    Launches an autonomous Browser Use AI agent to search live flight prices for the given route.
    """
    if not departure_date:
        # Default to tomorrow (T-1)
        departure_date = (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%d")

    api_key = os.getenv("BROWSER_USE_API_KEY")
    if not api_key:
        logger.warning("BROWSER_USE_API_KEY is not set. Looking for local fallback or environment configuration.")
        raise ValueError("BROWSER_USE_API_KEY environment variable is required to use Cloud Browser Use SDK.")

    # Lazy imports for browser-use SDK
    from browser_use import Agent, BrowserSession
    from browser_use_sdk.v4 import AsyncBrowserUse

    task_prompt = f"""
    You are an automated flight price intelligence agent for the Government of India (MoSPI).
    
    TASK:
    1. Navigate to Google Flights (https://www.google.com/travel/flights) or EaseMyTrip (https://www.easemytrip.com).
    2. Search for ONE-WAY economy non-stop flights from {origin} ({origin}) to {destination} ({destination}) on departure date {departure_date}.
    3. Look at the search results and extract up to 10 available flights.
    4. For each flight, extract:
       - Airline Name (IndiGo, Air India, SpiceJet, Akasa Air, etc.)
       - Flight Number (if visible, e.g. 6E 5021)
       - Departure Time (e.g. 07:00)
       - Arrival Time (e.g. 09:15)
       - Lowest Total Price in Indian Rupees (INR) as an integer (strip currency symbols and commas, e.g. 4950)
       - Non-stop status (true/false)
    5. Return the extracted data in valid JSON matching the format:
       {{
         "route": "{origin}-{destination}",
         "departure_date": "{departure_date}",
         "total_found": <count>,
         "flights": [
           {{
             "airline": "<Airline>",
             "flight_number": "<Flight Number>",
             "origin": "{origin}",
             "destination": "{destination}",
             "departure_time": "<Departure Time>",
             "arrival_time": "<Arrival Time>",
             "price_inr": <Integer Price in INR>,
             "is_non_stop": true,
             "source": "browser-use-agent"
           }}
         ]
       }}
    """

    logger.info(f"🚀 Initializing Browser Use Cloud session for route {origin}->{destination} on {departure_date}...")

    async with AsyncBrowserUse(api_key=api_key) as client:
        # Create browser in Indian proxy context for INR pricing
        browser = await client.browsers.create(
            proxy_country_code="in",
            timeout=timeout_minutes,
        )
        logger.info(f"🌐 Cloud Browser Session started. ID: {browser.id}")

        try:
            agent = Agent(
                task=task_prompt,
                browser_session=BrowserSession(cdp_url=browser.cdp_url),
            )
            
            logger.info("🤖 Agent is now autonomously navigating and extracting flight quotes...")
            result = await agent.run()
            logger.info("✅ Agent execution finished successfully!")
            
            # Print raw result
            print("\n" + "="*50)
            print("AGENT RESULT SUMMARY:")
            print(result)
            print("="*50 + "\n")
            
            return result

        except Exception as e:
            logger.error(f"❌ Error during Browser Use agent run: {e}")
            raise
        finally:
            logger.info(f"🛑 Stopping cloud browser session {browser.id} to avoid unnecessary billing...")
            await client.browsers.stop(browser.id)


async def main():
    # Example: Scrape DEL to BOM flights for tomorrow
    origin = "DEL"
    destination = "BOM"
    dep_date = (datetime.utcnow() + timedelta(days=2)).strftime("%Y-%m-%d")

    print(f"\n=======================================================")
    print(f"✈️ BHARAT-APIX / MOSPI AIRFARE SCRAPER AGENT")
    print(f"Route: {origin} -> {destination} | Date: {dep_date}")
    print(f"=======================================================\n")

    try:
        res = await scrape_flights_with_browser_use(
            origin=origin,
            destination=destination,
            departure_date=dep_date,
        )
        print("Scrape Complete! Output:", res)
    except Exception as err:
        print(f"\n⚠️ Execution error: {err}")


if __name__ == "__main__":
    asyncio.run(main())