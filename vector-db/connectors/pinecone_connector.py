import pinecone

def init_pinecone(api_key, index_name):
    pinecone.init(api_key=api_key)
    return pinecone.Index(index_name)
