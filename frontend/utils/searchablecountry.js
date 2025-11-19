// Modified SearchableCountryDropdown.js to fix the nesting issue
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView, // Using ScrollView instead of FlatList
} from 'react-native';

const SearchableCountryDropdown = ({ countries, value, onValueChange, placeholder }) => {
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredCountries, setFilteredCountries] = useState(countries);
  const [selectedCountry, setSelectedCountry] = useState(null);

  useEffect(() => {
    // Set initial selected country based on value prop
    if (value) {
      const country = countries.find(c => c.value === value);
      setSelectedCountry(country);
    }
  }, [value, countries]);

  useEffect(() => {
    if (query.trim()) {
      const filtered = countries.filter(
        country => country.label.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredCountries(filtered);
    } else {
      setFilteredCountries(countries);
    }
  }, [query, countries]);

  const handleSelect = (country) => {
    setSelectedCountry(country);
    onValueChange(country.value);
    setShowDropdown(false);
    setQuery('');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.inputContainer}
        onPress={() => setShowDropdown(!showDropdown)}
      >
        <Text style={selectedCountry ? styles.selectedText : styles.placeholderText}>
          {selectedCountry ? selectedCountry.label : placeholder}
        </Text>
      </TouchableOpacity>

      {showDropdown && (
        <View style={styles.dropdownContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search country..."
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {/* Using ScrollView instead of FlatList to avoid VirtualizedList nesting warning */}
          <ScrollView 
            style={styles.listContainer}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            {filteredCountries.length > 0 ? (
              filteredCountries.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    styles.item,
                    selectedCountry && selectedCountry.value === item.value && styles.selectedItem
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={styles.itemText}>{item.label}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.noResults}>No countries found</Text>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  inputContainer: {
    height: 50,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 15,
    justifyContent: 'center',
    color: '#000',
  },
  placeholderText: {
    color: '#A9A9A9',
  },
  selectedText: {
    color: '#000',
  },
  dropdownContainer: {
    position: 'absolute',
    top: 55,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    maxHeight: 250,
    zIndex: 1001,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchInput: {
    height: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingHorizontal: 15,
  },
  listContainer: {
    maxHeight: 200,
  },
  item: {
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
  },
  selectedItem: {
    backgroundColor: '#e6f3ff',
  },
  itemText: {
    fontSize: 14,
  },
  noResults: {
    padding: 15,
    textAlign: 'center',
    color: '#999',
  },
});

export default SearchableCountryDropdown;