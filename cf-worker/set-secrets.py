"""One-shot script to upload Worker secrets via the Cloudflare API.
Run once. Delete after."""
import json
import os
import urllib.request

TOKEN = "cfut_QcBlSGIZpU6PzZaE9HLeORVAd2V01wm76QZ85NDyc42cf252"
ACC = "1cb433ef3a46b9517af650afce9da960"
SCRIPT = "artisans-push"

PRIVATE_KEY = (
    "-----BEGIN PRIVATE KEY-----\n"
    "MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDVbNLF02AhNzOT\n"
    "DpvLSec2O2Jm9XC7LRhxEJm6TkIdy6esPaxXZgH9VtIoBTSAdJv9kHFbFFpsvO61\n"
    "DpQ/GzRG5cXqVJbO5yATRSMFXTlLZzDXX+s3B0xIglDECWbee00DACbBSrzNmV/y\n"
    "JJRTM1+xljsSvz5sQdfrjM8oHgyH6nP228igcByFBIf7px1Vm+ucUBlA45x9mQvt\n"
    "N+KRF4NleqNN33dlaZmbTv97XVbjzUpp6RCGZbXb5PtQIdc5y8EjxUG2vxI9uyFQ\n"
    "9DSUyqCIPu9qOTsQXiKmuRAc+CVlmSVwWdmtJ7topF1OxlAjmmfA76iawM01j3y0\n"
    "A7DhyJG3AgMBAAECggEAAX5ixmGFoSGE4dBKH8EbOI2++NU+X+rgwJrXz5JDlrSF\n"
    "31TI10CfdZiuqzwNp6sLAVD+jZhS9mqW7a6GKrAQU5UG+QxrkEER0H2C9plIs8B8\n"
    "3H5VIH/1P6Usmnp8/CFg9+SuNt2YjMo4Ub1mBG08AEYNYl7XTCWcg9nBCTA99YS/\n"
    "SjKefoI//mHvx5OTgB6GCzsU/zMVUz9qa/zhfT8MNx9/fdVTQsnMPNWVvc2/weGc\n"
    "bF2t9Fl73GsfnnS4hNew24DDe8A+SdIR/ikzGWUTrDK5+qKOZj2f7ES+Ix2bu8/z\n"
    "cP3Xff9M/gRrh61zpZ5PdHWSJbADAwbEKFaEWLG1eQKBgQD3JUVDyFDAUHWVmxVb\n"
    "1R7VGsuQWdd/TxYya1XFZaLE3L32G8udIrRFU3Dba0R2xROrjNlDSmhVoNofaVra\n"
    "EiJzhNFTbvW5HMeLhnLyzKAVsXET7THAUfK/9ilNDJdQgLliTra/ijIIAv1ZEhJx\n"
    "yxhzem8AgLGZARCtxtw1PY4bEwKBgQDdEkfXjx6aT/S118+imWNfoFuaaa0xPe2j\n"
    "J0lqrd7yo6/2mluTZ+CqmcyRc/Zk/UE6mGJwhHbzlNGqQm0AZwTkiHvhC2g2EqK6\n"
    "ywGiZxrq5b4E5yvcU8rq3MzO7Lf5ZP6KidbzlVcYeZNwuWEVeGfngYx3E0iBEFxl\n"
    "TNErPnR/TQKBgQDPXFMYQxsVsKxnoN4z1cXv0XKYo/i+VVHvbcViQRtnhzpPIxUc\n"
    "u4B7Zj4bq42fBU2ysxObdPPDXJmGn3Pd4jdLq1WiZkf/T9lRBLavZuauLNoOeQY0\n"
    "Mc22KEiQ4A6ZOdfRVu/YF5BQzolY0WPuXBQg18oIpvHbyVwAIgijFwmDRwKBgAKe\n"
    "+d0TZFB+DC+vvFV4LhZvJ0bgY95Glq+tgpBSOWd1C1wIHnfT7nT3V9aNomk2G3Tf\n"
    "Y6Nj3qkqpYW4PeSYVBWFjLpxUS368JT4XS+Yu1f3m1Yhi4KUN76rGX6GjfPV/7KS\n"
    "ycqfhaXToyzd9cm0YL786TZsMxrcn8vPqlcx6V2tAoGBAJVWZJh1gOWxmVfRu8cI\n"
    "+OASz5yIsFaBPrG+STYja6wQGD6KpnR03saPhYC06r7gzgecOqz/l8TBRMWjPSnV\n"
    "R0bNP3bmS1qm3fVbXOX2GTLLol1o2T/LaOtXsmxYQe96wM7P6Z45CKH3IlXOBt2+\n"
    "hVwRix4xCDw+aVyWDyXY5Oo1\n"
    "-----END PRIVATE KEY-----\n"
)
PUSH_AUTH = "f59d5b3cb8b2c54a2fea349b000ffeede367b8d3f6f7997a21f453f10fe180cf"

secrets = [
    ("FIREBASE_PROJECT_ID", "artisansmarket-5f2b6"),
    ("FIREBASE_CLIENT_EMAIL", "firebase-adminsdk-fbsvc@artisansmarket-5f2b6.iam.gserviceaccount.com"),
    ("FIREBASE_PRIVATE_KEY", PRIVATE_KEY),
    ("PUSH_AUTH_TOKEN", PUSH_AUTH),
]

url = f"https://api.cloudflare.com/client/v4/accounts/{ACC}/workers/scripts/{SCRIPT}/secrets"
headers = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

for name, value in secrets:
    body = json.dumps({"name": name, "text": value, "type": "secret_text"}).encode()
    req = urllib.request.Request(url, data=body, headers=headers, method="PUT")
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
            print(f"{name}: {'OK' if data.get('success') else 'FAIL'}")
    except Exception as e:
        print(f"{name}: ERROR {e}")
