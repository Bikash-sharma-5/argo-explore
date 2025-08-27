import weaviate

def init_weaviate(endpoint):
    client = weaviate.Client(endpoint)
    return client
