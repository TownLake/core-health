name: Collect Withings Data

on:
  schedule:
    - cron: '0 10 * * *'
  workflow_dispatch:
    inputs:
      target_date:
        description: 'Target date (YYYY-MM-DD format)'
        required: false
        default: ''

jobs:
  collect-data:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.x'
    
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install requests

    - name: Create data collection script
      run: |
        mkdir -p scripts
        cat > scripts/withings_collector.py << 'EOL'
        import os
        import sys
        import json
        import time
        from datetime import datetime
        import requests

        def get_withings_token():
            token_url = "https://wbsapi.withings.net/v2/oauth2"
            data = {
                "action": "requesttoken",
                "client_id": os.environ["WITHINGS_CLIENT_ID"],
                "client_secret": os.environ["WITHINGS_CLIENT_SECRET"],
                "grant_type": "refresh_token",
                "refresh_token": os.environ["WITHINGS_REFRESH_TOKEN"]
            }
            
            try:
                response = requests.post(token_url, data=data)
                response.raise_for_status()
                result = response.json()
                print("Token response:", json.dumps(result), file=sys.stderr)  # Debug output
                return result["body"]["access_token"]
            except Exception as e:
                print(f"Error getting token: {str(e)}", file=sys.stderr)
                print("Response content:", response.text, file=sys.stderr)
                raise

        def get_withings_data(token, target_date=None):
            if target_date:
                start_date = int(datetime.strptime(target_date, "%Y-%m-%d").timestamp())
            else:
                start_date = int(time.time()) - 86400
            end_date = start_date + 86400
            
            url = "https://wbsapi.withings.net/measure"
            headers = {"Authorization": f"Bearer {token}"}
            data = {
                "action": "getmeas",
                "meastypes": "1,6",
                "startdate": start_date,
                "enddate": end_date
            }
            response = requests.post(url, headers=headers, data=data)
            response.raise_for_status()
            return response.json()["body"]["measuregrps"]

        def process_measurements(measures):
            processed_data = {}
            for group in measures:
                date = datetime.fromtimestamp(group["date"]).strftime("%Y-%m-%d")
                if date not in processed_data:
                    processed_data[date] = {"weight": None, "fat_ratio": None}
                for measure in group["measures"]:
                    if measure["type"] == 1:
                        processed_data[date]["weight"] = measure["value"] * (10 ** measure["unit"])
                    elif measure["type"] == 6:
                        processed_data[date]["fat_ratio"] = measure["value"] * (10 ** measure["unit"])
            return processed_data

        def main():
            # Validate environment variables
            required_vars = ["WITHINGS_CLIENT_ID", "WITHINGS_CLIENT_SECRET", "WITHINGS_REFRESH_TOKEN"]
            for var in required_vars:
                if not os.environ.get(var):
                    print(f"Missing required environment variable: {var}", file=sys.stderr)
                    sys.exit(1)
                    
            target_date = sys.argv[1] if len(sys.argv) > 1 else None
            token = get_withings_token()
            measurements = get_withings_data(token, target_date)
            data = process_measurements(measurements)
            print(json.dumps(data))

        if __name__ == "__main__":
            main()
        EOL

    - name: Install Wrangler
      run: npm install -g wrangler
        
    - name: Configure Wrangler
      run: |
        echo "CLOUDFLARE_API_TOKEN=${{ secrets.CLOUDFLARE_API_TOKEN }}" >> $GITHUB_ENV
        echo "CLOUDFLARE_ACCOUNT_ID=${{ secrets.CLOUDFLARE_ACCOUNT_ID }}" >> $GITHUB_ENV
    
    - name: Run data collection and store in KV
      env:
        WITHINGS_CLIENT_ID: ${{ secrets.WITHINGS_CLIENT_ID }}
        WITHINGS_CLIENT_SECRET: ${{ secrets.WITHINGS_CLIENT_SECRET }}
        WITHINGS_REFRESH_TOKEN: ${{ secrets.WITHINGS_REFRESH_TOKEN }}
      run: |
        echo "Environment check:"
        if [ -z "$WITHINGS_REFRESH_TOKEN" ]; then
          echo "WITHINGS_REFRESH_TOKEN is not set"
          exit 1
        fi
        
        DATA=$(python scripts/withings_collector.py ${{ github.event.inputs.target_date }})
        echo "$DATA" | wrangler kv:key put --binding=WITHINGS_DATA "withings_data" -