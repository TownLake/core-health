from http.server import HTTPServer, BaseHTTPRequestHandler
import webbrowser
import urllib.parse
import requests
import json
from datetime import datetime
import getpass
import sys

# Constants
REDIRECT_URI = "http://localhost:8080"
AUTH_URL = "https://account.withings.com/oauth2_user/authorize2"
TOKEN_URL = "https://wbsapi.withings.net/v2/oauth2"

class OAuthHandler(BaseHTTPRequestHandler):
    def __init__(self, client_id, client_secret, *args, **kwargs):
        self.client_id = client_id
        self.client_secret = client_secret
        super().__init__(*args, **kwargs)
    
    def do_GET(self):
        # Parse the query parameters
        query_components = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        
        # Get the authorization code
        if 'code' in query_components:
            code = query_components['code'][0]
            
            # Exchange code for tokens
            data = {
                "action": "requesttoken",
                "grant_type": "authorization_code",
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "code": code,
                "redirect_uri": REDIRECT_URI
            }
            
            response = requests.post(TOKEN_URL, data=data)
            tokens = response.json()
            
            # Save tokens to a file
            if response.status_code == 200 and tokens.get('status') == 0:
                tokens['timestamp'] = datetime.now().isoformat()
                with open('withings_tokens.json', 'w') as f:
                    json.dump(tokens, f, indent=2)
                
                success_message = "Authorization successful! Check withings_tokens.json for your tokens."
                print("\n" + success_message)
                print("\nRefresh Token (save this as your GitHub secret):")
                print("-" * 80)
                print(tokens['body']['refresh_token'])
                print("-" * 80)
                
                self.send_response(200)
                self.send_header('Content-type', 'text/html')
                self.end_headers()
                self.wfile.write(f"<h1>{success_message}</h1>".encode())
                
                # Stop the server after successful authorization
                self.server.running = False
            else:
                error_message = f"Error getting tokens: {json.dumps(tokens, indent=2)}"
                print("\nError:", error_message)
                
                self.send_response(400)
                self.send_header('Content-type', 'text/html')
                self.end_headers()
                self.wfile.write(f"<h1>Error occurred</h1><pre>{error_message}</pre>".encode())
        else:
            self.send_response(400)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(b"<h1>No authorization code received</h1>")

def create_handler(client_id, client_secret):
    return lambda *args, **kwargs: OAuthHandler(client_id, client_secret, *args, **kwargs)

def main():
    print("Welcome to the Withings OAuth2 setup script!")
    print("Please enter your Withings API credentials.")
    print("(You can find these in your Withings developer account)")
    
    # Get credentials
    client_id = input("\nClient ID: ").strip()
    client_secret = getpass.getpass("Client Secret: ").strip()
    
    if not client_id or not client_secret:
        print("Error: Both Client ID and Client Secret are required!")
        sys.exit(1)
    
    # Start the local server
    server = HTTPServer(('localhost', 8080), create_handler(client_id, client_secret))
    server.running = True
    print("\nStarting local server on http://localhost:8080")
    
    # Construct the authorization URL
    auth_params = {
        "response_type": "code",
        "client_id": client_id,
        "scope": "user.metrics",
        "redirect_uri": REDIRECT_URI,
        "state": "withings_oauth"
    }
    auth_request_url = f"{AUTH_URL}?{urllib.parse.urlencode(auth_params)}"
    
    # Open the browser
    print("\nOpening browser for authorization...")
    webbrowser.open(auth_request_url)
    
    print("\nWaiting for callback...")
    print("(Press Ctrl+C to stop the server)")
    
    try:
        while server.running:
            server.handle_request()
    except KeyboardInterrupt:
        print("\nShutting down server...")
    finally:
        server.server_close()
        print("\nServer stopped.")

if __name__ == "__main__":
    main()
