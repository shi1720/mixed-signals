'use client';
import { useState } from 'react';
import { CITY_BY_ID, searchCities } from '@/lib/cities';
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from '@/components/ui/combobox';
export function CityPicker({
  value,
  onChange,
  id = 'city-picker',
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  id?: string;
}) {
  const [query, setQuery] = useState('');
  const filtered = searchCities(query);
  return (
    <Combobox
      items={filtered}
      value={value ? (CITY_BY_ID.get(value) ?? null) : null}
      onValueChange={(city) => onChange(city?.id ?? null)}
      onInputValueChange={setQuery}
      itemToStringLabel={(city) => `${city.name}, ${city.country}`}
      isItemEqualToValue={(a, b) => a.id === b.id}
      filter={null}
    >
      <ComboboxInput
        id={id}
        aria-label="Your city"
        placeholder="Search your city or country"
        className="city-picker-input"
        showTrigger={false}
        showClear={false}
      />
      <ComboboxContent className="city-picker-popup">
        <ComboboxEmpty>
          No city found. Try a country or a nearby listed city only if you date
          there.
        </ComboboxEmpty>
        <ComboboxList>
          {(city) => (
            <ComboboxItem key={city.id} value={city} className="city-option">
              <span>
                {city.name}
                <small>{city.country}</small>
              </span>
              <span className="city-code">{city.code}</span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
