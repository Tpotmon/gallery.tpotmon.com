import { useState, useMemo, useEffect } from 'preact/hooks';

interface Card {
    id: number | string;
    displayName: string;
    username: string;
    tier: string;
    rarity: string;
    abilityName: string;
    attackName: string;
    cardType: "character" | "action";
    fullData: any; // Full card data for rendering
}

interface CardSearchProps {
    cards: Card[];
    onFilteredCards: (filteredCards: Card[]) => void;
}

export default function CardSearch({ cards, onFilteredCards }: CardSearchProps) {
    // Initialize state from URL parameters
    const [searchTerm, setSearchTerm] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            return params.get('search') || '';
        }
        return '';
    });
    
    const [tierFilter, setTierFilter] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            return params.get('tier') || '';
        }
        return '';
    });

    const [typeFilter, setTypeFilter] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            return params.get('type') || '';
        }
        return '';
    });

    // Get unique values for filters
    const tiers = useMemo(() => {
        const uniqueTiers = [...new Set(cards.map(card => card.tier).filter(tier => tier !== ""))];
        return uniqueTiers.sort();
    }, [cards]);

    const cardTypes = useMemo(() => {
        const uniqueTypes = [...new Set(cards.map(card => card.cardType))];
        return uniqueTypes.sort();
    }, [cards]);

    // Filter cards based on search criteria
    const filteredCards = useMemo(() => {
        return cards.filter(card => {
            const matchesSearch = searchTerm === '' || 
                card.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                card.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                card.abilityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                card.attackName.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesTier = tierFilter === '' || card.tier === tierFilter;
            const matchesType = typeFilter === '' || card.cardType === typeFilter;

            return matchesSearch && matchesTier && matchesType;
        });
    }, [cards, searchTerm, tierFilter, typeFilter]);

    // Update URL when search parameters change
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            
            if (searchTerm) {
                url.searchParams.set('search', searchTerm);
            } else {
                url.searchParams.delete('search');
            }
            
            if (tierFilter) {
                url.searchParams.set('tier', tierFilter);
            } else {
                url.searchParams.delete('tier');
            }

            if (typeFilter) {
                url.searchParams.set('type', typeFilter);
            } else {
                url.searchParams.delete('type');
            }
            
            window.history.pushState({}, '', url.toString());
        }
    }, [searchTerm, tierFilter, typeFilter]);

    // Update parent component when filtered cards change
    useMemo(() => {
        onFilteredCards(filteredCards);
    }, [filteredCards, onFilteredCards]);

    const clearFilters = () => {
        setSearchTerm('');
        setTierFilter('');
        setTypeFilter('');
    };

    return (
        <div class="card bg-base-100 shadow-xl mb-8">
            <div class="card-body">
                <h2 class="card-title">Search & Filter Cards</h2>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    {/* Search Input */}
                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Search by name, username, or abilities</span>
                        </label>
                        <input
                            type="text"
                            placeholder="Search cards..."
                            class="input input-bordered h-12"
                            value={searchTerm}
                            onInput={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
                        />
                    </div>

                    {/* Tier Filter */}
                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Filter by tier</span>
                        </label>
                        <select
                            class="select select-bordered h-12"
                            value={tierFilter}
                            onChange={(e) => setTierFilter((e.target as HTMLSelectElement).value)}
                        >
                            <option value="">All tiers</option>
                            {tiers.map(tier => (
                                <option key={tier} value={tier}>{tier}</option>
                            ))}
                        </select>
                    </div>

                    {/* Card Type Filter */}
                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Filter by type</span>
                        </label>
                        <select
                            class="select select-bordered h-12"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter((e.target as HTMLSelectElement).value)}
                        >
                            <option value="">All types</option>
                            {cardTypes.map(type => (
                                <option key={type} value={type}>
                                    {type === "character" ? "Character Cards" : "Action Cards"}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div class="card-actions justify-between items-center mt-4">
                    <div class="text-sm text-base-content/70">
                        Showing {filteredCards.length} of {cards.length} cards
                    </div>
                    {(searchTerm || tierFilter || typeFilter) && (
                        <button class="btn btn-outline btn-sm" onClick={clearFilters}>
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}