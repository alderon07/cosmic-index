"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { FolderHeart, Plus, Trash2, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAppAuth } from "@/components/auth/app-auth-provider";

interface CollectionItem {
  id: number;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  isPublic: boolean;
  itemCount?: number;
  updatedAt: string;
}

export function CollectionsPageContent() {
  const auth = useAppAuth();
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const loadCollections = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/user/collections");
      if (!response.ok) {
        throw new Error("Failed to load collections");
      }

      const data = await response.json();
      setCollections(Array.isArray(data.collections) ? data.collections : []);
    } catch (error) {
      console.error(error);
      setCollections([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCollections();
  }, [loadCollections]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName || isCreating) return;

    setIsCreating(true);
    try {
      const response = await fetch("/api/user/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create collection");
      }

      const created = await response.json();
      setCollections((previous) => [created, ...previous]);
      setName("");
      setDescription("");
    } catch (error) {
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm("Delete this collection?");
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/user/collections/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete collection");
      }

      setCollections((previous) => previous.filter((collection) => collection.id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  if (!auth.isSignedIn) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Card>
          <CardContent className="py-10 text-center">
            <FolderHeart className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Sign in to manage your collections.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">Collections</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Group saved objects into reusable custom lists
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Collection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={handleCreate}>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Collection name"
              maxLength={100}
            />
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Short description (optional)"
              maxLength={500}
            />
            <Button type="submit" disabled={isCreating || !name.trim()}>
              {isCreating ? "Creating..." : "Create Collection"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-xl">Your Collections</h2>
        <Button variant="outline" size="sm" onClick={() => void loadCollections()} disabled={isLoading}>
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Loading collections...
          </CardContent>
        </Card>
      ) : collections.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Layers className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No collections yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {collections.map((collection) => (
            <Card key={collection.id} className="border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{collection.name}</CardTitle>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="outline">{collection.itemCount ?? 0} items</Badge>
                      {collection.isPublic ? <Badge variant="secondary">Public</Badge> : null}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      void handleDelete(collection.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {collection.description ? (
                  <p className="text-sm text-muted-foreground mb-2">{collection.description}</p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Updated {new Date(collection.updatedAt).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
