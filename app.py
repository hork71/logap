import os
import re
from pathlib import Path

from flask import Flask, jsonify, send_from_directory

from db import get_local_connection, init_db, get_live_events, get_report_events

BASE_DIR = Path(__file__).resolve().parent

app = Flask(__name__, static_folder='static', static_url_path='')

YEAR_MONTH_RE = re.compile(r'^\d{6}$')

with get_local_connection() as _conn:
    init_db(_conn)


@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')


@app.route('/live')
def live_page():
    return send_from_directory(app.static_folder, 'live.html')


@app.route('/report')
def report_page():
    return send_from_directory(app.static_folder, 'report.html')


@app.route('/api/live')
def live():
    conn = get_local_connection()
    try:
        return jsonify(get_live_events(conn))
    finally:
        conn.close()


@app.route('/api/report/<year_month>')
def report(year_month):
    if not YEAR_MONTH_RE.match(year_month):
        return jsonify({'message': 'yearMonth must be in YYYYMM format'}), 400

    conn = get_local_connection()
    try:
        return jsonify(get_report_events(conn, year_month))
    finally:
        conn.close()


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))
    app.run(host='0.0.0.0', port=port)
