const axios = require('axios');

/**
 * Search for location using SerpAPI Google Maps API
 * @param {string} query - Search query (address + optional business name)
 * @param {string} apiKey - SerpAPI key
 * @returns {Promise<Array>} Array of potential location results
 */
const searchLocation = async (query, apiKey) => {
  try {
    const response = await axios.get('https://serpapi.com/search', {
      params: {
        engine: 'google_maps',
        q: query,
        api_key: apiKey,
        type: 'search'
      }
    });

    const results = [];

    // Check for local results (multiple matches)
    if (response.data && response.data.local_results && response.data.local_results.length > 0) {
      response.data.local_results.forEach(result => {
        results.push({
          title: result.title || '',
          address: result.address || '',
          rating: result.rating || null,
          reviews: result.reviews || 0,
          type: result.type || '',
          phone: result.phone || '',
          website: result.website || '',
          thumbnail: result.thumbnail || '',
          gps_coordinates: result.gps_coordinates || null,
          place_id: result.place_id || '',
          data_id: result.data_id || '',
          links: result.links || null
        });
      });
    } 
    // Check for a single direct match (place results)
    else if (response.data && response.data.place_results) {
      const result = response.data.place_results;
      results.push({
        title: result.title || '',
        address: result.address || '',
        rating: result.rating || null,
        reviews: result.reviews || 0,
        type: result.type || '',
        phone: result.phone || '',
        website: result.website || '',
        thumbnail: result.thumbnail || '',
        gps_coordinates: result.gps_coordinates || null,
        place_id: result.place_id || '',
        data_id: result.data_id || '',
        links: result.links || null
      });
    }

    return results;
  } catch (error) {
    console.error('SerpAPI Error:', error.message);
    throw new Error(`Failed to fetch location data: ${error.message}`);
  }
};

module.exports = {
  searchLocation
};
