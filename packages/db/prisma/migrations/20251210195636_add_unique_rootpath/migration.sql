/*
  Warnings:

  - A unique constraint covering the columns `[rootPath]` on the table `repos` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "repos_rootPath_key" ON "repos"("rootPath");
