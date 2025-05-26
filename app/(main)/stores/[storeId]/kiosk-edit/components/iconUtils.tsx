import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconPrefix, IconName, findIconDefinition, library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { JSX } from 'react/jsx-runtime';

// Add all FontAwesome solid and regular icons to the library if not already added globally
// It's generally better to do this at the top level of your app, 
// but if this is the only place using a wide range of icons, it can be here.
// Ensure library.add(fas, far) is called in GlobalOptionEditor.tsx or a higher-level component.

export const renderIconDisplay = (iconString?: string, sizeClass: string = "text-xl sm:text-2xl"): JSX.Element | null => {
    if (!iconString || iconString.trim() === '') return null;
    const parts = iconString.split(' ');
    let parsedPrefix: IconPrefix | undefined = undefined;
    let parsedIconName: IconName | undefined = undefined;

    if (parts.length > 0) {
        const firstPart = parts[0].toLowerCase();
        let nameCandidate: string | undefined = parts.length > 1 ? parts.slice(1).join(' ') : undefined;
        if (firstPart === 'fas' || firstPart === 'fa-solid' || firstPart === 'solid') parsedPrefix = 'fas';
        else if (firstPart === 'far' || firstPart === 'fa-regular' || firstPart === 'regular') parsedPrefix = 'far';
        if (nameCandidate) {
            if (nameCandidate.startsWith('fa-')) nameCandidate = nameCandidate.substring(3);
            parsedIconName = nameCandidate as IconName;
        }
    }

    if (parsedPrefix && parsedIconName) {
        try {
            const iconLookup = findIconDefinition({ prefix: parsedPrefix, iconName: parsedIconName });
            if (iconLookup) {
                return <FontAwesomeIcon icon={[parsedPrefix, parsedIconName]} className={`${sizeClass} flex-shrink-0`} />;
            }
        } catch (e) { console.warn(`Error rendering FA icon: ${iconString}`, e); }
    }
    const faRelated = iconString.toLowerCase().includes('fa') || iconString.toLowerCase().includes('solid') || iconString.toLowerCase().includes('regular') || (parsedPrefix !== undefined);
    if (!faRelated && (iconString.length <= 2 || iconString.match(/\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]/))) {
        return <span className={`${sizeClass} flex-shrink-0`}>{iconString}</span>;
    }
    return <span className="text-gray-400 text-xs flex-shrink-0" title={`Unknown icon: ${iconString}`}><FontAwesomeIcon icon={['far', 'question-circle']} className={sizeClass} /></span>;
  }; 