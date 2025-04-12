if __name__ == "__main__":
    ip_objetivo = "192.168.0.100"
    analisis = analizar_vulnerabilidades(ip_objetivo)
    
    for servicio, cves in analisis.items():
        print(f"\n🔎 {servicio}")
        if cves:
            for cve in cves:
                print(f" - {cve['id']}: {cve['summary']}")
        else:
            print(" - No se encontraron CVEs recientes.")

