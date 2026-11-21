import { Play } from "@phosphor-icons/react";
import type { CollectionSummary } from "../types/music";
import { Artwork } from "./Artwork";

interface CollectionCardProps {
  collection: CollectionSummary;
  onOpen: (collection: CollectionSummary) => void;
}

export function CollectionCard({ collection, onOpen }: CollectionCardProps) {
  return (
    <button
      type="button"
      className="collection-card"
      onClick={() => onOpen(collection)}
      aria-label={`Open ${collection.title} by ${collection.subtitle}`}
    >
      <div className="collection-cover-wrap">
        <Artwork
          src={collection.artwork}
          alt={`${collection.title} artwork`}
          className="collection-cover-img"
          size={360}
        />
        <span className="collection-play-fab" aria-hidden="true">
          <Play size={18} weight="fill" />
        </span>
      </div>
      <div style={{ minWidth: 0, width: "100%" }}>
        <div className="collection-title">{collection.title}</div>
        <div className="collection-sub">{collection.subtitle}</div>
      </div>
    </button>
  );
}
