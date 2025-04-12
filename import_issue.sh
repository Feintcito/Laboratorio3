#!/bin/bash

file="github_issues_sprint1.json"

# Quita saltos de línea para facilitar parsing
json=$(tr -d '\n' < "$file")

# Extrae cada bloque de issue (entre llaves)
echo "$json" | grep -o '{[^}]*}' | while read -r block; do
    # Extrae título
    title=$(echo "$block" | sed -n 's/.*"title": *"\([^"]*\)".*/\1/p')

    # Extrae body
    body=$(echo "$block" | sed -n 's/.*"body": *"\([^"]*\)".*/\1/p')

    # Extrae labels (como lista separada por coma)
    labels=$(echo "$block" | sed -n 's/.*"labels": *\[\(.*\)\].*/\1/p' | sed 's/"//g' | tr -d ' ')

    echo "📥 Creando issue: $title"
    gh issue create --title "$title" --body "$body" --label "$labels"
done

