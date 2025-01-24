import os
import sys
import json
import requests
import logging
from datetime import datetime, date, timedelta
from zoneinfo import ZoneInfo

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class OuraClient:
    def __init__(self, token):
        self.token = token
        self.headers = {'Authorization': f'Bearer {token}'}
        self.base_url = 'https://api.ouraring.com/v2/usercollection'
        logger.info("Initialized Oura client")

    def get_date_range(self, target_date=None):
        if target_date is None:
            target_date = date.today()
        elif isinstance(target_date, str):
            target_date = datetime.strptime(target_date, '%Y-%m-%d').date()
        
        formatted_date = target_date.strftime('%Y-%m-%d')
        logger.info(f"Using target date: {formatted_date}")
        return formatted_date

    def fetch_data(self, endpoint, target_date):
        url = f'{self.base_url}/{endpoint}'
        params = {
            'start_date': target_date,
            'end_date': target_date
        }
        logger.info(f"Fetching data from {endpoint} for date {target_date}")
        try:
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            data = response.json()
            logger.info(f"Successfully fetched {endpoint} data")
            logger.debug(f"Raw {endpoint} response: {json.dumps(data, indent=2)}")
            return data
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching {endpoint} data: {str(e)}")
            raise

    def get_daily_data(self, target_date):
        try:
            # Fetch all required data
            sleep_data = self.fetch_data('sleep', target_date)
            daily_sleep = self.fetch_data('daily_sleep', target_date)
            cardio_data = self.fetch_data('daily_cardiovascular_age', target_date)
            spo2_data = self.fetch_data('daily_spo2', target_date)

            # Process sleep data
            sleep_sessions = sleep_data.get('data', [])
            logger.info(f"Found {len(sleep_sessions)} total sleep sessions")
            logger.debug(f"Sleep sessions: {json.dumps(sleep_sessions, indent=2)}")
            
            if not sleep_sessions:
                logger.warning(f"No sleep sessions found for {target_date}")
                return None

            # Look for sessions that either:
            # 1. Have the target date as their day
            # 2. End on the target date
            # 3. Start on the target date
            target_sessions = [s for s in sleep_sessions 
                             if (s.get('day') == target_date or 
                                 (s.get('bedtime_end', '').startswith(target_date)) or
                                 (s.get('bedtime_start', '').startswith(target_date)))]
            
            logger.info(f"Found {len(target_sessions)} sessions for target date")
            logger.debug(f"Target date sessions: {json.dumps(target_sessions, indent=2)}")
            
            if not target_sessions:
                # Check two days around the target date since sleep can span days
                expanded_sessions = [s for s in sleep_sessions 
                                  if s.get('bedtime_end') and s.get('bedtime_start')]
                logger.info(f"Checking expanded date range, found {len(expanded_sessions)} sessions")
                if expanded_sessions:
                    target_sessions = [expanded_sessions[0]]
                
            if not target_sessions:
                logger.warning(f"No sleep sessions found for target date {target_date}")
                return None

            main_sleep = max(target_sessions, key=lambda x: x.get('total_sleep_duration', 0))
            logger.info(f"Found main sleep session for {target_date}")
            logger.debug(f"Main sleep session data: {json.dumps(main_sleep, indent=2)}")

            # Get sleep score from daily_sleep endpoint
            sleep_score = next(
                (item['score'] for item in daily_sleep.get('data', [])
                 if item.get('day') == target_date),
                None
            )
            logger.info(f"Sleep score for {target_date}: {sleep_score}")

            # Process SpO2 data
            spo2_info = next(
                (item for item in spo2_data.get('data', [])
                 if item.get('day') == target_date),
                {}
            )
            spo2_percentage = spo2_info.get('spo2_percentage', {})
            spo2_avg = (spo2_percentage.get('average') 
                       if isinstance(spo2_percentage, dict) else None)
            logger.info(f"SpO2 average for {target_date}: {spo2_avg}")

            # Process cardio age data
            cardio_info = next(
                (item for item in cardio_data.get('data', [])
                 if item.get('day') == target_date),
                {}
            )
            cardio_age = cardio_info.get('vascular_age')
            logger.info(f"Cardio age for {target_date}: {cardio_age}")

            # Format bedtime
            bedtime_start = main_sleep.get('bedtime_start')
            if bedtime_start:
                dt = datetime.fromisoformat(bedtime_start.replace('Z', '+00:00'))
                bedtime_date = dt.strftime('%Y-%m-%d')
                bedtime_time = dt.strftime('%H:%M:%S')
                logger.info(f"Bedtime: {bedtime_date} {bedtime_time}")
            else:
                bedtime_date = bedtime_time = None
                logger.warning("No bedtime data available")

            # Format total sleep
            total_sleep_minutes = round(main_sleep.get('total_sleep_duration', 0) / 60)
            total_sleep = (f"{total_sleep_minutes // 60:02d}:"
                          f"{total_sleep_minutes % 60:02d}"
                          if total_sleep_minutes else None)
            logger.info(f"Total sleep: {total_sleep}")

            deep_sleep_minutes = round(main_sleep.get('deep_sleep_duration', 0) / 60)
            resting_heart_rate = main_sleep.get('lowest_heart_rate')
            average_hrv = main_sleep.get('average_hrv')

            daily_data = {
                'date': target_date,
                'deep_sleep_minutes': deep_sleep_minutes,
                'sleep_score': sleep_score,
                'bedtime_start_date': bedtime_date,
                'bedtime_start_time': bedtime_time,
                'total_sleep': total_sleep,
                'resting_heart_rate': resting_heart_rate,
                'average_hrv': average_hrv,
                'spo2_avg': spo2_avg,
                'cardio_age': cardio_age,
                'collected_at': datetime.now(ZoneInfo('UTC')).isoformat()
            }

            logger.info("Successfully compiled daily data")
            logger.debug(f"Compiled data: {json.dumps(daily_data, indent=2)}")
            return daily_data

        except Exception as e:
            logger.error(f"Error processing daily data: {str(e)}", exc_info=True)
            raise

class CloudflareD1:
    def __init__(self, account_id, api_token):
        self.account_id = account_id
        self.headers = {
            'Authorization': f'Bearer {api_token}',
            'Content-Type': 'application/json'
        }
        self.base_url = f'https://api.cloudflare.com/client/v4/accounts/{account_id}/d1/database/sam_health_data'
        logger.info("Initialized Cloudflare D1 client")

    def insert_data(self, data):
        if not data:
            logger.warning("No data to insert")
            return False

        # Construct SQL query with parameterized values
        placeholders = ', '.join(['?'] * len(data))
        columns = ', '.join(data.keys())
        
        query = f"""
            INSERT INTO oura_data ({columns})
            VALUES ({placeholders})
        """
        
        logger.info(f"Executing query with columns: {columns}")
        logger.debug(f"Query parameters: {list(data.values())}")

        # Make the API request
        url = f'{self.base_url}/query'
        payload = {
            'sql': query,
            'params': list(data.values())
        }

        try:
            response = requests.post(url, headers=self.headers, json=payload)
            response_data = response.json()
            
            if response.status_code == 200:
                logger.info("Successfully inserted data into D1")
                logger.debug(f"D1 response: {json.dumps(response_data, indent=2)}")
                return True
            else:
                logger.error(f"Error inserting data: {response.status_code}")
                logger.error(f"Error response: {response.text}")
                return False

        except requests.exceptions.RequestException as e:
            logger.error(f"Request error inserting data: {str(e)}", exc_info=True)
            return False
        except Exception as e:
            logger.error(f"Unexpected error inserting data: {str(e)}", exc_info=True)
            return False

def main(target_date=None):
    logger.info(f"Starting Oura data collection for date: {target_date or 'today'}")

    # Get environment variables
    try:
        oura_token = os.environ['OURA_TOKEN']
        cf_account_id = os.environ['CLOUDFLARE_ACCOUNT_ID']
        cf_api_token = os.environ['CLOUDFLARE_API_TOKEN']
    except KeyError as e:
        logger.error(f"Missing required environment variable: {str(e)}")
        raise

    try:
        # Initialize clients
        oura = OuraClient(oura_token)
        d1 = CloudflareD1(cf_account_id, cf_api_token)

        # Get and format target date
        formatted_date = oura.get_date_range(target_date)
        logger.info(f"Processing data for date: {formatted_date}")

        # Fetch and process data
        daily_data = oura.get_daily_data(formatted_date)
        if not daily_data:
            logger.error(f"No data found for {formatted_date}")
            return

        # Store data in D1
        success = d1.insert_data(daily_data)
        if not success:
            raise Exception("Failed to store data in D1")

        logger.info("Data collection and storage completed successfully")

    except Exception as e:
        logger.error(f"Fatal error in main process: {str(e)}", exc_info=True)
        raise e

if __name__ == "__main__":
    target_date = sys.argv[1] if len(sys.argv) > 1 else None
    main(target_date)
