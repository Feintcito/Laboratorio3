import requests

def buscar_cves(servicio, version):
    query = f"{servicio} {version}".lower()
    url = f"https://cve.circl.lu/api/search/{query}"
    r = requests.get(url)
    if r.status_code == 200:
        datos = r.json()
        return datos.get("data", [])[:5]  # Top 5 CVEs más recientes
    return []

