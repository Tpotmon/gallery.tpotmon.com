import { useState, useMemo, useEffect } from 'preact/hooks';
import CardSearch from './CardSearch';

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

interface GalleryWithSearchProps {
    allCards: Card[];
    cardsPerPage?: number;
}

export default function GalleryWithSearch({ allCards, cardsPerPage = 12 }: GalleryWithSearchProps) {
    // Initialize state from URL parameters
    const [filteredCards, setFilteredCards] = useState<Card[]>(allCards);
    const [currentPage, setCurrentPage] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            return parseInt(params.get('page') || '1');
        }
        return 1;
    });

    // Debug: Log state changes
    console.log('Component render - currentPage:', currentPage, 'filteredCards.length:', filteredCards.length);

    // Update URL when page changes
    useEffect(() => {
        console.log('currentPage changed to:', currentPage);
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            if (currentPage === 1) {
                url.searchParams.delete('page');
            } else {
                url.searchParams.set('page', currentPage.toString());
            }
            window.history.pushState({}, '', url.toString());
        }
    }, [currentPage]);

    // Reset to page 1 when filters change
    const handleFilteredCards = (cards: Card[]) => {
        setFilteredCards(prevCards => {
            // Only reset page if the filtered results actually changed
            if (prevCards.length !== cards.length || 
                prevCards.some((card, index) => card.id !== cards[index]?.id)) {
                console.log('Filtered cards changed, resetting to page 1');
                setCurrentPage(1);
                // Also update URL to remove page parameter when resetting
                if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('page');
                    window.history.pushState({}, '', url.toString());
                }
            }
            return cards;
        });
    };

    // Pagination logic
    const totalPages = Math.ceil(filteredCards.length / cardsPerPage);
    const startIndex = (currentPage - 1) * cardsPerPage;
    const endIndex = startIndex + cardsPerPage;
    const cardsOnPage = filteredCards.slice(startIndex, endIndex);

    const prevPage = currentPage > 1 ? currentPage - 1 : null;
    const nextPage = currentPage < totalPages ? currentPage + 1 : null;

    // Generate page numbers for pagination
    const generatePageNumbers = (current: number, total: number) => {
        const pages: (number | string)[] = [];
        
        if (total <= 7) {
            // Show all pages if total is small
            for (let i = 1; i <= total; i++) {
                pages.push(i);
            }
        } else {
            // Show current page with 2 pages on each side
            let start = Math.max(1, current - 2);
            let end = Math.min(total, current + 2);
            
            // Adjust range if we're near the beginning or end
            if (start === 1) {
                end = Math.min(total, 5);
            } else if (end === total) {
                start = Math.max(1, total - 4);
            }
            
            // Add ellipsis before if we're not starting at 1
            if (start > 1) {
                pages.push("...");
            }
            
            // Add the page range
            for (let i = start; i <= end; i++) {
                pages.push(i);
            }
            
            // Add ellipsis after if we're not ending at the last page
            if (end < total) {
                pages.push("...");
            }
        }
        
        return pages;
    };

    const pageNumbers = generatePageNumbers(currentPage, totalPages);

    return (
        <div>
            {/* Search Component */}
            <CardSearch cards={allCards} onFilteredCards={handleFilteredCards} />

            {/* Cards Grid */}
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                {cardsOnPage.map((card) => (
                    <div key={card.id} class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
                        <a href={`/gallery/${card.id}`} class="block">
                            <div class="card-body p-4">
                                <div 
                                    class="w-full"
                                    dangerouslySetInnerHTML={{
                                        __html: card.cardType === "action" ? 
                                            // Action Card SVG
                                            `<div class="w-full mx-auto">
                                                <svg viewBox="0 0 600 840" class="w-full h-auto ${card.fullData.disabled ? 'grayscale brightness-75 opacity-60' : ''}" xmlns="http://www.w3.org/2000/svg">
                                                    <!-- Card Border and Base -->
                                                    <rect x="10" y="10" width="580" height="820" rx="30" ry="30" fill="#53c4b4" />
                                                    <rect x="25" y="25" width="550" height="790" rx="28" ry="28" fill="#2e9794" />
                                                    <rect x="30" y="30" width="540" height="780" rx="24" ry="24" fill="#edeae2" />

                                                    <!-- Card Header -->
                                                    <rect x="40" y="40" width="120" height="30" rx="5" ry="5" fill="#ff6b35" />
                                                    <text x="100" y="62" font-family="Arial" font-weight="bold" font-size="20" fill="white" text-anchor="middle">${card.fullData.type.toUpperCase()}</text>
                                                    
                                                    <text x="300" y="62" font-family="Arial" font-weight="bold" text-anchor="middle" font-size="20" fill="#999">tpotmon.com</text>

                                                    <!-- Card Image (full width, ~50% height) -->
                                                    <rect x="40" y="80" width="520" height="350" rx="10" ry="10" fill="#e5e5e5" stroke="#ccc" stroke-width="2" />
                                                    <image href="${card.fullData.imageUrl}" x="40" y="80" width="520" height="350" preserveAspectRatio="xMidYMid slice" />

                                                    <!-- Card Title (moved under image, left-aligned) -->
                                                    <foreignObject x="50" y="450" width="500" height="50">
                                                        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial; font-weight: bold; font-size: 24px; color: #333; text-align: left; display: flex; align-items: center; height: 100%; overflow-wrap: break-word; line-height: 1.2;">
                                                            ${card.fullData.title}
                                                        </div>
                                                    </foreignObject>

                                                    <!-- Effect Section -->
                                                    <rect x="40" y="510" width="520" height="2" rx="10" ry="10" fill="#9a9a9a40" />
                                                    <text x="55" y="540" font-family="Arial" font-weight="bold" font-size="20" fill="#333">Effect</text>
                                                    
                                                    <foreignObject x="55" y="550" width="490" height="100">
                                                        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial; font-size: 15px; color: #555; line-height: 1.3; overflow-wrap: break-word;">
                                                            ${card.fullData.effect}
                                                        </div>
                                                    </foreignObject>

                                                    <!-- Flavor Text Section -->
                                                    <rect x="40" y="660" width="520" height="2" rx="10" ry="10" fill="#9a9a9a40" />
                                                    <text x="55" y="685" font-family="Arial" font-weight="bold" font-size="18" fill="#666">Flavor Text</text>
                                                    
                                                    <foreignObject x="55" y="690" width="490" height="60">
                                                        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial; font-style: italic; font-size: 13px; color: #777; line-height: 1.2; overflow-wrap: break-word;">
                                                            ${card.fullData.flavor}
                                                        </div>
                                                    </foreignObject>

                                                    <!-- Footer (moved up) -->
                                                    <rect x="100" y="760" width="400" height="24" ry="6" fill="#9a9a9a60" />
                                                    <image href="${(() => {
                                                        const rarityImages = {
                                                            "Common": "/rarity/common.png",
                                                            "Uncommon": "/rarity/uncommon.png", 
                                                            "Rare": "/rarity/rare.png",
                                                            "Based Rare": "/rarity/based-rare.png",
                                                            "Legendary": "/rarity/legendary.png",
                                                            "Ultra Rare": "/rarity/ultra-rare.png",
                                                            // Legacy mappings for backwards compatibility
                                                            "Ace Spec": "/rarity/legendary.png",
                                                            "Double Rare": "/rarity/based-rare.png",
                                                        };
                                                        return rarityImages[card.fullData.rarity] || "/rarity/common.png";
                                                    })()}" x="120" y="756" width="36" height="36" />
                                                    <text x="165" y="778" font-family="Arial" font-size="15" fill="#333">${card.fullData.rarity}</text>
                                                    <text x="440" y="778" font-family="Arial" font-size="15" fill="#333" text-anchor="end">Card No. ${card.fullData.id.toString().padStart(3, "0")}</text>
                                                    
                                                    <!-- Disabled Overlay -->
                                                    ${card.fullData.disabled ? `
                                                    <g>
                                                        <rect x="30" y="30" width="540" height="780" rx="24" ry="24" fill="rgba(0,0,0,0.3)" />
                                                        <text x="300" y="420" font-family="Arial" font-weight="bold" font-size="32" fill="#ff4444" text-anchor="middle">NOT AVAILABLE</text>
                                                        <text x="300" y="450" font-family="Arial" font-size="18" fill="#ff4444" text-anchor="middle">IN BOOSTER PACKS</text>
                                                    </g>
                                                    ` : ''}
                                                </svg>
                                            </div>` : (card.cardType === "character" && card.fullData.cardType === "fullArt") ?
                                            // Full Art Card SVG
                                            `<div class="w-full mx-auto">
                                                <svg viewBox="0 0 600 840" class="w-full h-auto ${card.fullData.disabled ? 'grayscale brightness-75 opacity-60' : ''}" xmlns="http://www.w3.org/2000/svg">
                                                    <!-- Full Art Background with border radius -->
                                                    <defs>
                                                        <clipPath id="fullArtClip_${card.id}">
                                                            <rect x="0" y="0" width="600" height="840" rx="30" ry="30"/>
                                                        </clipPath>
                                                        
                                                        <!-- Subtle bottom gradient for text readability -->
                                                        <linearGradient id="bottomGradient_${card.id}" x1="0%" y1="0%" x2="0%" y2="100%">
                                                            <stop offset="0%" stop-color="rgba(0,0,0,0)" />
                                                            <stop offset="70%" stop-color="rgba(0,0,0,0)" />
                                                            <stop offset="100%" stop-color="rgba(0,0,0,0.4)" />
                                                        </linearGradient>
                                                        
                                                        <!-- Text shadow filter -->
                                                        <filter id="textShadow_${card.id}">
                                                            <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.5)"/>
                                                        </filter>
                                                        
                                                        <!-- Blur filter for background panels -->
                                                        <filter id="panelBlur_${card.id}">
                                                            <feGaussianBlur stdDeviation="2"/>
                                                        </filter>
                                                    </defs>
                                                    
                                                    <!-- Full art background -->
                                                    <image href="${card.fullData.fullArtUrl || card.fullData.bannerPicUrl || "#"}" x="0" y="0" width="600" height="840" clip-path="url(#fullArtClip_${card.id})" preserveAspectRatio="xMidYMid slice" />
                                                    
                                                    <!-- Subtle bottom gradient -->
                                                    <rect x="0" y="0" width="600" height="840" rx="30" ry="30" fill="url(#bottomGradient_${card.id})" />

                                                    <!-- Top row continuous bar -->
                                                    <g filter="url(#textShadow_${card.id})">
                                                        <!-- Megabie section - left with rounded left corners only -->
                                                        <rect x="30" y="30" width="120" height="40" rx="20" ry="20" fill="rgba(132, 202, 218, 0.95)"/>
                                                        <rect x="130" y="30" width="20" height="40" fill="rgba(132, 202, 218, 0.95)"/>
                                                        <text x="90" y="55" font-family="Arial" font-weight="bold" font-size="16" fill="black" text-anchor="middle">${card.fullData.tier.toUpperCase()}</text>
                                                        
                                                        <!-- Name section - middle with black background -->
                                                        <rect x="150" y="30" width="320" height="40" fill="rgba(0, 0, 0, 0.6)" filter="url(#panelBlur_${card.id})"/>
                                                        
                                                        <!-- HP section - right with rounded right corners only -->
                                                        <rect x="470" y="30" width="100" height="40" rx="20" ry="20" fill="rgba(255, 82, 82, 0.95)"/>
                                                        <rect x="470" y="30" width="20" height="40" fill="rgba(255, 82, 82, 0.95)"/>
                                                        <text x="520" y="46" font-family="Arial" font-weight="bold" font-size="12" fill="white" text-anchor="middle">HP</text>
                                                        <text x="520" y="58" font-family="Arial" font-weight="bold" font-size="16" fill="white" text-anchor="middle">${card.fullData.hitPoints}</text>
                                                        
                                                        <!-- Display name - centered vertically in top bar -->
                                                        ${card.fullData.isBlueVerified ? `
                                                            <text x="200" y="56" font-family="Arial" font-weight="bold" font-size="24" fill="white" dominant-baseline="middle">${card.fullData.displayName}</text>
                                                        ` : `
                                                            <text x="165" y="56" font-family="Arial" font-weight="bold" font-size="24" fill="white" dominant-baseline="middle">${card.fullData.displayName}</text>
                                                        `}
                                                        
                                                        <!-- White border around entire bar -->
                                                        <rect x="30" y="30" width="540" height="40" rx="20" ry="20" fill="none" stroke="white" stroke-width="2"/>
                                                    </g>

                                                    <!-- BlueCheck - centered vertically with display name -->
                                                    ${card.fullData.isBlueVerified ? `
                                                    <g filter="url(#textShadow_${card.id})">
                                                        <image href="/check.png" x="162" y="33" width="35" height="35" />
                                                    </g>` : ''}

                                                    <!-- Combined ability and attack panel -->
                                                    <g filter="url(#textShadow_${card.id})">
                                                        <!-- Translucent background with blur -->
                                                        <rect x="30" y="500" width="540" height="270" rx="15" ry="15" fill="rgba(0, 0, 0, 0.7)" stroke="rgba(255, 255, 255, 0.2)" stroke-width="1" filter="url(#panelBlur_${card.id})"/>
                                                        
                                                        <!-- Ability section -->
                                                        <text x="50" y="530" font-family="Arial" font-weight="bold" font-size="22" fill="white">${card.fullData.abilityName}</text>
                                                        <foreignObject x="50" y="540" width="500" height="80">
                                                            <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial; font-size: 14px; color: rgba(255, 255, 255, 0.9); line-height: 1.4; overflow-wrap: break-word; padding-top: 5px; padding-bottom: 10px;">
                                                                ${card.fullData.abilityDescription}
                                                            </div>
                                                        </foreignObject>
                                                        
                                                        <!-- Divider line - moved up -->
                                                        <line x1="50" y1="610" x2="550" y2="610" stroke="rgba(255, 255, 255, 0.3)" stroke-width="1"/>
                                                        
                                                        <!-- Attack section - moved up -->
                                                        <text x="50" y="635" font-family="Arial" font-weight="bold" font-size="22" fill="white">${card.fullData.attackName}</text>
                                                        <text x="550" y="635" font-family="Arial" font-weight="bold" font-size="24" fill="white" text-anchor="end">${card.fullData.attackDamage}</text>
                                                        <image href="${(() => {
                                                            const typeImages = {
                                                                goon: "/types/goon.png", 
                                                                psyop: "/types/psyop.png",
                                                                gaslight: "/types/gaslight.png",
                                                                drama: "/types/drama.png", 
                                                                gay: "/types/gay.png", 
                                                                furry: "/types/furry.png", 
                                                                catfish: "/types/catfish.png", 
                                                                roast: "/types/roast.png", 
                                                                cringe: "/types/cringe.png", 
                                                                thirst: "/types/thirst.png",
                                                            };
                                                            return typeImages[card.fullData.attackType] || "/types/goon.png";
                                                        })()}" x="50" y="645" width="48" height="48" />
                                                        
                                                        <foreignObject x="106" y="645" width="424" height="120">
                                                            <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial; font-size: 16px; color: rgba(255, 255, 255, 0.9); line-height: 1.5; overflow-wrap: break-word; padding-top: 5px; padding-bottom: 15px;">
                                                                ${card.fullData.attackDescription}
                                                            </div>
                                                        </foreignObject>
                                                    </g>

                                                    <!-- Bottom info bar -->
                                                    <g filter="url(#textShadow_${card.id})">
                                                        <rect x="30" y="785" width="540" height="45" rx="10" ry="10" fill="rgba(0, 0, 0, 0.7)" filter="url(#panelBlur_${card.id})"/>
                                                        
                                                    <!-- Bottom info bar - 70% width and centered -->
                                                    <g filter="url(#textShadow_${card.id})">
                                                        <rect x="116" y="785" width="364" height="45" rx="10" ry="10" fill="rgba(0, 0, 0, 0.7)" filter="url(#panelBlur_${card.id})"/>
                                                        
                                                        <!-- Weakness & Resistance - repositioned for narrower bar -->
                                                        <image href="${(() => {
                                                            const typeImages = {
                                                                goon: "/types/goon.png", 
                                                                psyop: "/types/psyop.png",
                                                                gaslight: "/types/gaslight.png",
                                                                drama: "/types/drama.png", 
                                                                gay: "/types/gay.png", 
                                                                furry: "/types/furry.png", 
                                                                catfish: "/types/catfish.png", 
                                                                roast: "/types/roast.png", 
                                                                cringe: "/types/cringe.png", 
                                                                thirst: "/types/thirst.png",
                                                            };
                                                            return typeImages[card.fullData.weaknessType] || "/types/goon.png";
                                                        })()}" x="131" y="795" width="32" height="32" />
                                                        <text x="171" y="815" font-family="Arial" font-size="20" fill="white">+${card.fullData.weaknessAmount}</text>
                                                        
                                                        <image href="${(() => {
                                                            const typeImages = {
                                                                goon: "/types/goon.png", 
                                                                psyop: "/types/psyop.png",
                                                                gaslight: "/types/gaslight.png",
                                                                drama: "/types/drama.png", 
                                                                gay: "/types/gay.png", 
                                                                furry: "/types/furry.png", 
                                                                catfish: "/types/catfish.png", 
                                                                roast: "/types/roast.png", 
                                                                cringe: "/types/cringe.png", 
                                                                thirst: "/types/thirst.png",
                                                            };
                                                            return typeImages[card.fullData.resistType] || "/types/goon.png";
                                                        })()}" x="236" y="795" width="32" height="32" />
                                                        <text x="276" y="815" font-family="Arial" font-size="20" fill="white">-${card.fullData.resistAmount}</text>
                                                        
                                                        <!-- Card info - repositioned for narrower bar -->
                                                        <image href="${(() => {
                                                            const rarityImages = {
                                                                "Common": "/rarity/common.png",
                                                                "Uncommon": "/rarity/uncommon.png", 
                                                                "Rare": "/rarity/rare.png",
                                                                "Based Rare": "/rarity/based-rare.png",
                                                                "Legendary": "/rarity/legendary.png",
                                                                "Ultra Rare": "/rarity/ultra-rare.png",
                                                                // Legacy mappings for backwards compatibility
                                                                "Legendary": "/rarity/legendary.png", "Ace Spec": "/rarity/legendary.png",
                                                                "Based Rare": "/rarity/based-rare.png", "Double Rare": "/rarity/based-rare.png",
                                                            };
                                                            return rarityImages[card.fullData.rarity] || "/rarity/common.png";
                                                        })()}" x="345" y="786" width="43" height="43" />
                                                        <text x="426" y="812" font-family="Arial" font-size="18" fill="rgba(255, 255, 255, 0.8)" text-anchor="middle">#${String(card.fullData.id).padStart(3, "0")}</text>
                                                    </g>
                                                    </g>
                                                    
                                                    <!-- Disabled Overlay -->
                                                    ${card.fullData.disabled ? `
                                                    <g>
                                                        <rect x="0" y="0" width="600" height="840" rx="30" ry="30" fill="rgba(0,0,0,0.4)" />
                                                        <rect x="150" y="390" width="300" height="60" rx="15" ry="15" fill="rgba(255, 68, 68, 0.9)" stroke="white" stroke-width="2"/>
                                                        <text x="300" y="415" font-family="Arial" font-weight="bold" font-size="20" fill="white" text-anchor="middle">NOT AVAILABLE</text>
                                                        <text x="300" y="435" font-family="Arial" font-size="16" fill="white" text-anchor="middle">IN BOOSTER PACKS</text>
                                                    </g>
                                                    ` : ''}
                                                </svg>
                                            </div>` :
                                            // Character Card SVG (existing code)
                                            `<div class="w-full mx-auto">
                                                <svg viewBox="0 0 600 840" class="w-full h-auto ${card.fullData.disabled ? 'grayscale brightness-75 opacity-60' : ''}" xmlns="http://www.w3.org/2000/svg">
                                                    <!-- Card Border and Base -->
                                                    <rect x="10" y="10" width="580" height="820" rx="30" ry="30" fill="#53c4b4" />
                                                    <rect x="25" y="25" width="550" height="790" rx="28" ry="28" fill="#2e9794" />
                                                    <rect x="30" y="30" width="540" height="780" rx="24" ry="24" fill="#edeae2" />

                                                    <!-- Card Header -->
                                                    <clipPath id="profileBanner_${card.id}">
                                                        <rect x="40" y="80" width="520" height="220" rx="10" ry="10"/>
                                                    </clipPath>
                                                    <image href="${card.fullData.bannerPicUrl || "#"}" x="40" y="80" width="520" height="220" clip-path="url(#profileBanner_${card.id})" preserveAspectRatio="xMidYMid slice" />

                                                    <!-- Name and Tier -->
                                                    <text x="50" y="410" font-family="Arial" font-weight="bold" font-size="28" fill="#333">${card.fullData.displayName}</text>
                                                    <text x="50" y="435" font-family="Arial" font-size="20" fill="#777">@${card.fullData.username}</text>

                                                    <!-- Tier -->
                                                    <text x="300" y="62" font-family="Arial" font-weight="bold" text-anchor="middle" font-size="20" fill="#999">tpotmon.com</text>
                                                    <rect x="40" y="40" width="120" height="30" rx="5" ry="5" fill="#84cada" />
                                                    <text x="100" y="62" font-family="Arial" font-weight="bold" font-size="20" fill="black" text-anchor="middle">${card.fullData.tier.toUpperCase()}</text>

                                                    <!-- HP Bar -->
                                                    <rect x="420" y="40" width="140" height="30" rx="15" ry="15" fill="#ff5252" />
                                                    <text x="490" y="62" font-family="Arial" font-weight="bold" font-size="20" fill="white" text-anchor="middle">HP ${card.fullData.hitPoints}</text>

                                                    <!-- Profile Image -->
                                                    <clipPath id="profileClip_${card.id}">
                                                        <circle cx="300" cy="260" r="120" />
                                                    </clipPath>
                                                    <image href="${card.fullData.profilePicUrl || "#"}" x="180" y="140" width="240" height="240" clip-path="url(#profileClip_${card.id})" preserveAspectRatio="xMidYMid slice" />
                                                    <circle cx="300" cy="260" r="120" fill="none" stroke="#ddd" stroke-width="5" />

                                                    <!-- Verified Badge -->
                                                    ${card.fullData.isBlueVerified ? '<image href="/check.png" x="320" y="340" width="60" height="60" />' : ''}

                                                    <!-- Ability -->
                                                    <rect x="40" y="445" width="520" height="2" rx="10" ry="10" fill="#9a9a9a40" />
                                                    <text x="55" y="480" font-family="Arial" font-weight="bold" font-size="22" fill="#555">Ability: ${card.fullData.abilityName}</text>
                                                    <foreignObject x="55" y="490" width="490" height="60">
                                                        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial; font-size: 16px; color: #666; line-height: 1.2; overflow-wrap: break-word;">
                                                            ${card.fullData.abilityDescription}
                                                        </div>
                                                    </foreignObject>

                                                    <!-- Attack -->
                                                    <rect x="40" y="560" width="520" height="2" rx="10" ry="10" fill="#9a9a9a40" />
                                                    <text x="55" y="605" font-family="Arial" font-weight="bold" font-size="22" fill="#333">Attack: ${card.fullData.attackName}</text>
                                                    <text x="540" y="605" font-family="Arial" font-weight="bold" font-size="22" fill="#333" text-anchor="end">${card.fullData.attackDamage}</text>
                                                    <text x="60" y="670" font-family="Arial" font-size="14" text-anchor="center" fill="#777">${card.fullData.attackType}</text>

                                                    <foreignObject x="120" y="620" width="410" height="80">
                                                        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial; font-size: 16px; color: #555; line-height: 1.2; overflow-wrap: break-word;">
                                                            ${card.fullData.attackDescription}
                                                        </div>
                                                    </foreignObject>

                                                    <!-- Line Break -->
                                                    <rect x="40" y="710" width="520" height="2" rx="10" ry="10" fill="#9a9a9a40" />

                                                    <!-- Weakness and Resistance -->
                                                    <text x="55" y="740" font-family="Arial" font-weight="bold" font-size="20" fill="#555">Weakness</text>
                                                    <text x="80" y="760" font-family="Arial" font-size="16" text-anchor="center" fill="#555">${card.fullData.weaknessType}</text>
                                                    <text x="250" y="745" font-family="Arial" font-weight="bold" font-size="20" fill="#555" text-anchor="end">+${card.fullData.weaknessAmount}</text>

                                                    <text x="335" y="740" font-family="Arial" font-weight="bold" font-size="20" fill="#555">Resistance</text>
                                                    <text x="360" y="760" font-family="Arial" font-size="16" text-anchor="center" fill="#555">${card.fullData.resistType}</text>
                                                    <text x="540" y="745" font-family="Arial" font-weight="bold" font-size="20" fill="#555" text-anchor="end">-${card.fullData.resistAmount}</text>

                                                    <!-- Footer -->
                                                    <rect x="100" y="780" width="400" height="24" ry="6" fill="#9a9a9a60" />
                                                    <image href="${(() => {
                                                        const rarityImages = {
                                                            "Common": "/rarity/common.png",
                                                            "Uncommon": "/rarity/uncommon.png", 
                                                            "Rare": "/rarity/rare.png",
                                                            "Based Rare": "/rarity/based-rare.png",
                                                            "Legendary": "/rarity/legendary.png",
                                                            "Ultra Rare": "/rarity/ultra-rare.png",
                                                            // Legacy mappings for backwards compatibility
                                                            "Ace Spec": "/rarity/legendary.png",
                                                            "Double Rare": "/rarity/based-rare.png",
                                                        };
                                                        return rarityImages[card.fullData.rarity] || "/rarity/common.png";
                                                    })()}" x="120" y="776" width="36" height="36" />
                                                    <text x="165" y="798" font-family="Arial" font-size="15" fill="#333">${card.fullData.rarity}</text>
                                                    <text x="440" y="798" font-family="Arial" font-size="15" fill="#333" text-anchor="end">Card No. ${card.id.toString().padStart(5, "0")}</text>

                                                    <!-- Stats Flair -->
                                                    <text x="40" y="320" font-family="Arial" font-size="14" fill="#aaa">${card.fullData.followers} followers</text>
                                                    <text x="560" y="320" font-family="Arial" font-size="14" fill="#aaa" text-anchor="end">${card.fullData.following} following</text>
                                                    
                                                    <!-- Disabled Overlay -->
                                                    ${card.fullData.disabled ? `
                                                    <g>
                                                        <rect x="30" y="30" width="540" height="780" rx="24" ry="24" fill="rgba(0,0,0,0.3)" />
                                                        <text x="300" y="420" font-family="Arial" font-weight="bold" font-size="32" fill="#ff4444" text-anchor="middle">NOT AVAILABLE</text>
                                                        <text x="300" y="450" font-family="Arial" font-size="18" fill="#ff4444" text-anchor="middle">IN BOOSTER PACKS</text>
                                                    </g>
                                                    ` : ''}
                                                </svg>
                                            </div>`
                                    }}
                                />
                                <div class="card-actions justify-between items-center mt-4">
                                    <div class="text-sm text-base-content/70">
                                        #{card.cardType === "action" ? card.fullData.id.toString().padStart(3, "0") : card.id.toString().padStart(3, "0")}
                                    </div>
                                    <div class="badge badge-primary">
                                        {card.cardType === "action" ? "Action" : card.tier}
                                    </div>
                                </div>
                            </div>
                        </a>
                    </div>
                ))}
            </div>

            {/* No results message */}
            {filteredCards.length === 0 && (
                <div class="text-center py-12">
                    <div class="text-6xl mb-4">🔍</div>
                    <h3 class="text-2xl font-bold mb-2">No cards found</h3>
                    <p class="text-base-content/70">Try adjusting your search terms or filters</p>
                </div>
            )}

            {/* Debug info */}
            <div class="text-center mb-4 text-sm text-base-content/70">
                Page {currentPage} of {totalPages} | Showing {cardsOnPage.length} cards | Total filtered: {filteredCards.length}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div class="flex justify-center">
                    <div class="join">
                        {/* First button */}
                        {currentPage > 1 && (
                            <button 
                                class="join-item btn"
                                onClick={() => {
                                    console.log('First clicked, setting page to 1');
                                    setCurrentPage(1);
                                }}
                            >
                                First
                            </button>
                        )}
                        
                        {/* Previous button */}
                        {prevPage && (
                            <button 
                                class="join-item btn"
                                onClick={() => {
                                    console.log(`Prev clicked, going to page ${prevPage}`);
                                    setCurrentPage(prevPage);
                                }}
                            >
                                Prev
                            </button>
                        )}
                        
                        {/* Page numbers */}
                        {pageNumbers.map((pageNum, index) => (
                            pageNum === "..." ? (
                                <button key={`ellipsis-${index}`} class="join-item btn btn-disabled">...</button>
                            ) : pageNum === currentPage ? (
                                <button key={pageNum} class="join-item btn btn-active">{pageNum}</button>
                            ) : (
                                <button 
                                    key={pageNum} 
                                    class="join-item btn"
                                    onClick={() => {
                                        console.log(`Page ${pageNum} clicked`);
                                        setCurrentPage(pageNum as number);
                                    }}
                                >
                                    {pageNum}
                                </button>
                            )
                        ))}
                        
                        {/* Next button */}
                        {nextPage && (
                            <button 
                                class="join-item btn"
                                onClick={() => {
                                    console.log(`Next clicked, going to page ${nextPage}`);
                                    setCurrentPage(nextPage);
                                }}
                            >
                                Next
                            </button>
                        )}
                        
                        {/* Last button */}
                        {currentPage < totalPages && (
                            <button 
                                class="join-item btn"
                                onClick={() => {
                                    console.log(`Last clicked, going to page ${totalPages}`);
                                    setCurrentPage(totalPages);
                                }}
                            >
                                Last
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}