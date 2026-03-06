#!/usr/bin/env python3
"""
Export Swagger documentation from FastAPI application to HTML file.
"""

import json
import sys
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Import app from main.py
from app.main import app  # noqa: E402
from scripts.openapi_sorter import sort_openapi_paths  # noqa: E402


def generate_swagger_html(openapi_json: dict) -> str:
    """Generate HTML with embedded Swagger UI."""
    html_template = """<!DOCTYPE html>
<html>
<head>
    <title>{title} - Swagger UI</title>
    <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui.css">
    <style>
        html {{
            box-sizing: border-box;
            overflow: -moz-scrollbars-vertical;
            overflow-y: scroll;
        }}
        *, *:before, *:after {{
            box-sizing: inherit;
        }}
        body {{
            margin: 0;
            background: #fafafa;
        }}
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {{
            const spec = {spec};
            window.ui = SwaggerUIBundle({{
                spec: spec,
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                tryItOutEnabled: true
            }});
        }};
    </script>
</body>
</html>"""

    title = openapi_json.get('info', {}).get('title', 'API Documentation')
    spec_json = json.dumps(openapi_json, indent=2, ensure_ascii=False)

    return html_template.format(title=title, spec=spec_json)


def resolve_refs(schema: dict, root_schema: dict) -> dict:
    """
    Recursively resolve $ref in OpenAPI schema.

    Args:
        schema: Current schema object to process
        root_schema: Root OpenAPI schema for reference resolution

    Returns:
        Schema with resolved references
    """
    if isinstance(schema, dict):
        if '$ref' in schema:
            # Extract reference path (e.g., "#/components/schemas/LoginRequest")
            ref_path = schema['$ref']
            if ref_path.startswith('#/'):
                # Navigate to the referenced schema
                parts = ref_path[2:].split('/')
                ref_schema = root_schema
                for part in parts:
                    ref_schema = ref_schema[part]
                # Return a copy to avoid circular references
                return resolve_refs(ref_schema.copy(), root_schema)
            return schema
        else:
            # Recursively resolve refs in nested objects
            return {k: resolve_refs(v, root_schema) for k, v in schema.items()}
    elif isinstance(schema, list):
        return [resolve_refs(item, root_schema) for item in schema]
    else:
        return schema


def main():
    """Main function to export Swagger HTML."""
    # Get OpenAPI schema from FastAPI app
    openapi_schema = app.openapi()

    # Resolve all $ref to avoid reference resolution issues in standalone HTML
    openapi_schema = resolve_refs(openapi_schema, openapi_schema)

    # Sort the paths alphabetically
    sorted_schema = sort_openapi_paths(openapi_schema)

    # Generate HTML
    html_content = generate_swagger_html(sorted_schema)

    # Create output directory if it doesn't exist
    output_dir = backend_dir / 'documents' / 'api'
    output_dir.mkdir(parents=True, exist_ok=True)

    # Write HTML file
    output_file = output_dir / 'swagger.html'
    output_file.write_text(html_content, encoding='utf-8')

    print(f'Swagger HTML exported to: {output_file}')
    print(f'File size: {len(html_content):,} bytes')

    # Also export raw OpenAPI JSON for reference (sorted version)
    openapi_file = output_dir / 'openapi.json'
    openapi_file.write_text(json.dumps(sorted_schema, indent=2), encoding='utf-8')
    print(f'OpenAPI JSON also exported to: {openapi_file}')


if __name__ == '__main__':
    main()
