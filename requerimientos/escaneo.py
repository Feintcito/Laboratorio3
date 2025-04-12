import subprocess
import re

def escanear_servicios(ip):
    # Ejecuta nmap en formato grepable (-sV para versiones)
    resultado = subprocess.check_output(["nmap", "-sV", ip], text=True)

    servicios = []
    for linea in resultado.split("\n"):
        match = re.search(r"(\d+/tcp)\s+open\s+(\S+)\s+(.+)", linea)
        if match:
            puerto = match.group(1)
            servicio = match.group(2)
            version = match.group(3)
            servicios.append({
                "puerto": puerto,
                "servicio": servicio,
                "version": version
            })
    return servicios

