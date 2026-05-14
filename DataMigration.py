import gspread
import pandas as pd
import time
from pathlib import Path

# ── AUTH: Opens browser on first run, no JSON key needed ──
gc = gspread.oauth()

SHEET_ID = "17r2MosXQKcP0CPc9XlhXs_spQLNlef4qp2LkvQHubq0"
sh = gc.open_by_key(SHEET_ID)
ASSETS_DIR = Path(__file__).resolve().parent / "Assets"

def upload_df(csv_file, sheet_name):
    csv_path = ASSETS_DIR / csv_file
    df = pd.read_csv(csv_path)
    df = df.fillna("")                        # clean NaN values
    ws = sh.worksheet(sheet_name)
    data = df.values.tolist()
    chunk_size = 500
    for i in range(0, len(data), chunk_size):
        ws.append_rows(data[i:i+chunk_size], value_input_option='RAW')
        print(f"  ↑ {sheet_name}: {min(i+chunk_size, len(data))}/{len(data)} rows")
        time.sleep(1)                         # avoid Google API rate limit
    print(f"✅ Done: {sheet_name}\n")

upload_df("restaurants.csv",     "Restaurants")
upload_df("delivery_agents.csv", "Delivery_Agents")
upload_df("users.csv",           "Users")
upload_df("orders.csv",          "Orders")