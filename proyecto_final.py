import subprocess
import re
import requests
import json


def descubrir_hosts(red_local):
    print(f"\n🔍 Descubriendo hosts activos en la red {red_local}...\n")
    try:
        resultado = subprocess.check_output(["nmap", "-sn", red_local], text=True)
        lineas = resultado.splitlines()
        hosts = []

        for linea in lineas:
            if "Nmap scan report for" in linea:
                ip = re.search(r"Nmap scan report for (.+)", linea).group(1)
                hosts.append(ip)

        print(f"✅ {len(hosts)} host(s) activo(s) encontrado(s): {hosts}\n")
        return hosts

    except subprocess.CalledProcessError as e:
        print("❌ Error ejecutando Nmap:", e)
        return []


def analizar_servicios(ip):
    print(f"📡 Escaneando servicios en {ip}...\n")
    try:
        resultado = subprocess.check_output(
            ["nmap", "-sV", "--top-ports", "100", ip], text=True
        )
        return resultado
    except subprocess.CalledProcessError as e:
        print(f"❌ Error al escanear servicios en {ip}: {e}")
        return ""


def extraer_servicios(nmap_output):
    servicios = []
    lineas = nmap_output.splitlines()

    for linea in lineas:
        match = re.search(r"(\d+/tcp)\s+open\s+(\S+)\s+([\w\.-]+)", linea)
        if match:
            puerto = match.group(1)
            servicio = match.group(2)
            version = match.group(3)
            servicios.append((puerto, servicio, version))

    return servicios


def consultar_cves(servicio, version):
    print(f"🔎 Buscando CVEs para {servicio} {version}...")
    query = f"{servicio} {version}"
    try:
        response = requests.get(f"https://cve.circl.lu/api/search/{query}")
        if response.status_code == 200:
            data = response.json()
            return data.get("results", [])[:5]  # Solo mostramos los 5 primeros CVEs
        else:
            print(f"⚠️ No se pudo obtener CVEs para {query}")
            return []
    except Exception as e:
        print(f"❌ Error al consultar CVEs: {e}")
        return []


def main():
    red_local = input("💻 Ingresa la red a escanear (ej: 192.168.0.0/24): ")
    hosts = descubrir_hosts(red_local)

    for ip in hosts:
        print(f"\n🚀 Analizando {ip}...\n{'=' * 40}")
        salida_nmap = analizar_servicios(ip)
        servicios = extraer_servicios(salida_nmap)

        if not servicios:
            print("⚠️ No se encontraron servicios.")
            continue

        for puerto, servicio, version in servicios:
            print(f"\n🧩 {puerto} → {servicio} {version}")
            cves = consultar_cves(servicio, version)

            if not cves:
                print("   ⚠️ No se encontraron CVEs.")
            else:
                for cve in cves:
                    print(f"   🔐 {cve.get('id')}: {cve.get('summary')[:100]}...")


if __name__ == "__main__":
    main()
