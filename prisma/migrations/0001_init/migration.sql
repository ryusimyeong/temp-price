-- CreateTable
CREATE TABLE "Search" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "query" TEXT NOT NULL,
    "queryKey" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "markets" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "searchId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "marketplace" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "normalizedTitle" TEXT NOT NULL,
    "priceText" TEXT NOT NULL,
    "price" INTEGER,
    "imageUrl" TEXT,
    "location" TEXT,
    "sellerKey" TEXT,
    "postedText" TEXT,
    "excludedReason" TEXT,
    CONSTRAINT "Listing_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "Search" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Search_queryKey_region_createdAt_idx" ON "Search"("queryKey", "region", "createdAt");

-- CreateIndex
CREATE INDEX "Search_createdAt_idx" ON "Search"("createdAt");

-- CreateIndex
CREATE INDEX "Listing_searchId_position_idx" ON "Listing"("searchId", "position");

-- CreateIndex
CREATE INDEX "Listing_marketplace_externalId_idx" ON "Listing"("marketplace", "externalId");
