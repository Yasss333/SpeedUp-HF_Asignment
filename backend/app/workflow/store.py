from typing import Annotated

from fastapi import Depends, HTTPException, Request
from pymongo import ReturnDocument


class MongoStore:
    def __init__(self, database):
        self.database = database

    async def insert(self, name, document):
        await self.database[name].insert_one(document.copy())

    async def find_one(self, name, query):
        return await self.database[name].find_one(query)

    async def find(self, name, query):
        return await self.database[name].find(query).sort("_id", 1).to_list(length=1000)

    async def page(self, query, skip, limit):
        collection = self.database["emails"]
        total = await collection.count_documents(query)
        rows = (
            await collection.find(query)
            .sort(
                [
                    ("priority_rank", 1),
                    ("created_at", -1),
                    ("_id", 1),
                ]
            )
            .skip(skip)
            .limit(limit)
            .to_list(length=limit)
        )
        return rows, total

    async def prepare(self):
        for name in ("users", "clients", "emails"):
            await self.database[name].create_index("expires_at", expireAfterSeconds=0)
        await self.database["users"].create_index("token_hash", unique=True)
        await self.database["clients"].create_index("tenant_id")
        await self.database["emails"].create_index(
            [
                ("tenant_id", 1),
                ("priority_rank", 1),
                ("created_at", -1),
            ]
        )

    async def update(self, name, query, values):
        return await self.database[name].find_one_and_update(
            query,
            {"$set": values},
            return_document=ReturnDocument.AFTER,
        )


def get_store(request: Request):
    database = request.app.state.database
    if database is None:
        raise HTTPException(503, "MongoDB is not configured")
    return MongoStore(database)


StoreDependency = Annotated[MongoStore, Depends(get_store)]
