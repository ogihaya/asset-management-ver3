"""
Utility to sort OpenAPI paths alphabetically for consistent documentation.
"""


def sort_openapi_paths(openapi_schema: dict) -> dict:
    """
    Sort OpenAPI paths alphabetically.

    Args:
        openapi_schema: The OpenAPI schema dictionary

    Returns:
        OpenAPI schema with sorted paths
    """
    if 'paths' in openapi_schema:
        openapi_schema['paths'] = dict(sorted(openapi_schema['paths'].items()))

    return openapi_schema
