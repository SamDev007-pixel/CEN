from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"


def test_get_latest_index():
    response = client.get("/index/")
    assert response.status_code == 200
    data = response.json()
    assert "data" in data


def test_get_route_index_history():
    response = client.get("/index/DEL-BOM")
    assert response.status_code == 200
    assert response.json()["route"] == "DEL-BOM"


def test_get_audit_overview():
    response = client.get("/audit/")
    assert response.status_code == 200
    assert "summary" in response.json()


def test_get_route_audit_lineage():
    response = client.get("/audit/DEL-BOM")
    assert response.status_code == 200
    assert response.json()["route"] == "DEL-BOM"


def test_export_json_and_csv():
    # JSON export
    res_json = client.get("/export?format=json")
    assert res_json.status_code == 200
    assert res_json.json()["coicop_item_code"] == "07.3.3.1"

    # CSV export
    res_csv = client.get("/export?format=csv")
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]
    assert "coicop_classification" in res_csv.text
