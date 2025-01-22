name: Collect Withings Data

on:
  schedule:
    - cron: '0 10 * * *'  # Runs at 10 AM UTC daily
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
    
    - name: Install Wrangler
      run: npm install -g wrangler
        
    - name: Configure Wrangler
      run: |
        echo "CLOUDFLARE_API_TOKEN=${{ secrets.CLOUDFLARE_API_TOKEN }}" >> $GITHUB_ENV
        echo "CLOUDFLARE_ACCOUNT_ID=${{ secrets.CLOUDFLARE_ACCOUNT_ID }}" >> $GITHUB_ENV
    
    - name: Run data collection script
      env:
        WITHINGS_CLIENT_ID: ${{ secrets.WITHINGS_CLIENT_ID }}
        WITHINGS_CLIENT_SECRET: ${{ secrets.WITHINGS_CLIENT_SECRET }}
        WITHINGS_REFRESH_TOKEN: ${{ secrets.WITHINGS_REFRESH_TOKEN }}
      run: python data-gather/collect_withings_data.py ${{ github.event.inputs.target_date }}