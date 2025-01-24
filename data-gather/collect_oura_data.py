import os
import sys
import json
import logging
import requests
from datetime import datetime, date, timedelta
from zoneinfo import ZoneInfo

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
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
        
        # If we want data for Jan 21, we need Jan 20-21 for sleep metrics
        start_date = (target_date - timedelta(days=1)).strftime('%Y-%m-%d')
        end_date = target_date.strftime('%Y-%m-%d')
        
        logger.info(f"Date range: {start_date} to {end_date}")
        return start_date, end_date, target_date.strftime('%Y-%m-%d')

    def fetch_data(self, endpoint, start_date, end_date):
        url = f'{self.base_url}/{endpoint}'
        params = {
            'start_date': start_date,
            'end_date': end_date
        }
        logger.info(f"Fetching data from {endpoint} for date range {start_date} to {end_date}")
        
        try:
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            data = response.json()
            logger.info(f"Successfully fetched {endpoint} data")
            logger.debug(f"Raw {endpoint} response: {json.dumps(data, indent=2)}")
            return data.get('data', [])
        except Exception as e:
            logger.error(f"Error fetching {endpoint} data: {str(e)}")
            raise

    def get_daily_metrics(self, start_date, end_date, target_date):
        # Fetch all required daily data
        daily_sleep = self.fetch_data('daily_sleep', start_date, end_date)
        daily_readiness = self.fetch_data('daily_readiness', start_date, end_date)
        cardio_data = self.fetch_data('daily_cardiovascular_age', target_date, target_date)
        spo2_data = self.fetch_data('daily_spo2', target_date, target_date)

        # Get target date metrics
        target_sleep = next((item for item in daily_sleep if item['day'] == target_date), {})
        target_readiness = next((item for item in daily_readiness if item['day'] == target_date), {})
        
        if not target_sleep and not target_readiness:
            logger.warning(f"No daily metrics found for {target_date}")
            return None

        spo2_info = next((item for item in spo2_data if item.get('day') == target_date), {})
        spo2_percentage = spo2_info.get('spo2_percentage', {})
        spo2_avg = spo2_percentage.get('average') if isinstance(spo2_percentage, dict) else None

        cardio_info = next((item for item in cardio_data if item.get('day') == target_date), {})

        # Extract metrics from sleep response
        deep_sleep_score = target_sleep.get('contributors', {}).get('deep_sleep')
        sleep_score = target_sleep.get('score')
        total_sleep_score = target_sleep.get('contributors', {}).get('total_sleep')

        # Extract metrics from readiness response
        hrv = target_readiness.get('contributors', {}).get('hrv_balance')
        resting_hr = target_readiness.get('contributors', {}).get('resting_heart_rate')

        # Compile metrics
        daily_data = {
            'date': target_date,
            'sleep': {
                'deep_sleep_minutes': None,  # This comes from sleep detail endpoint
                'sleep_score': sleep_score,
                'deep_sleep_score': deep_sleep_score,
                'total_sleep_score': total_sleep_score,
                'bedtime_start_date': None,  # This comes from sleep detail endpoint
                'bedtime_start_time': None,  # This comes from sleep detail endpoint
                'total_sleep': None,  # This comes from sleep detail endpoint
                'resting_heart_rate': resting_hr,
                'average_hrv': hrv
            },
            'health': {
                'spo2_avg': spo2_avg,
                'cardio_age': cardio_info.get('vascular_age')
            },
            'metadata': {
                'collected_at': datetime.now(ZoneInfo('UTC')).isoformat()
            }
        }

        return daily_data

class CloudflareD1:
    def __init__(self, account_id, api_token):
        self.account_id = account_id
        self.headers = {
            'Authorization': f'Bearer {api_token}',
            'Content-Type': 'application/json'
        }
        self.base_url = f'https://api.cloudflare.com/client/v4/accounts/{account_id}/d1/database'
        logger.info("Initialized Cloudflare D1 client")

    def insert_data(self, data):
        if not data:
            logger.warning("No data to insert")
            return False

        # D1 expects flattened data
        flattened_data = {
            'date': data['date'],
            'deep_sleep_minutes': data['sleep']['deep_sleep_minutes'],
            'sleep_score': data['sleep']['sleep_score'],
            'bedtime_start_date': data['sleep']['bedtime_start_date'],
            'bedtime_start_time': data['sleep']['bedtime_start_time'],
            'total_sleep': data['sleep']['total_sleep'],
            'resting_heart_rate': data['sleep']['resting_heart_rate'],
            'average_hrv': data['sleep']['average_hrv'],
            'spo2_avg': data['health']['spo2_avg'],
            'cardio_age': data['health']['cardio_age'],
            'collected_at': data['metadata']['collected_at']
        }

        # Construct SQL query with parameterized values
        columns = ', '.join(flattened_data.keys())
        placeholders = ', '.join(['?'] * len(flattened_data))
        
        query = f"INSERT INTO oura_data ({columns}) VALUES ({placeholders})"
        
        logger.info(f"Executing query with columns: {columns}")
        logger.debug(f"Query parameters: {list(flattened_data.values())}")

        try:
            response = requests.post(
                f'{self.base_url}/sam_health_data/query', 
                headers=self.headers,
                json={
                    'params': list(flattened_data.values()), 
                    'sql': query
                }
            )
            response_data = response.json()
            
            if response.status_code == 200:
                logger.info("Successfully inserted data into D1")
                logger.debug(f"D1 response: {json.dumps(response_data, indent=2)}")
                return True
            else:
                logger.error(f"Error inserting data: {response.status_code}")
                logger.error(f"Error response: {response.text}")
                return False

        except Exception as e:
            logger.error(f"Error inserting data: {str(e)}", exc_info=True)
            return False

def main(target_date=None):
    logger.info(f"Starting Oura data collection for date: {target_date or 'today'}")

    try:
        oura_token = os.environ['OURA_TOKEN']
        cf_account_id = os.environ['CLOUDFLARE_ACCOUNT_ID']
        cf_api_token = os.environ['CLOUDFLARE_API_TOKEN']
    except KeyError as e:
        logger.error(f"Missing required environment variable: {str(e)}")
        raise

    try:
        oura = OuraClient(oura_token)
        d1 = CloudflareD1(cf_account_id, cf_api_token)

        # Get date range for fetching data
        start_date, end_date, target_date = oura.get_date_range(target_date)
        logger.info(f"Processing data for date: {target_date}")

        # Fetch daily metrics
        daily_data = oura.get_daily_metrics(start_date, end_date, target_date)
        if not daily_data:
            logger.error(f"No data found for {target_date}")
            return

        # Store data in D1
        if not d1.insert_data(daily_data):
            raise Exception("Failed to store data in D1")

        logger.info("Data collection and storage completed successfully")

    except Exception as e:
        logger.error(f"Fatal error in main process: {str(e)}", exc_info=True)
        raise e

if __name__ == "__main__":
    target_date = sys.argv[1] if len(sys.argv) > 1 else None
    main(target_date)
