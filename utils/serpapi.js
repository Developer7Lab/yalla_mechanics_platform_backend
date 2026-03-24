const axios = require('axios');


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

    if (response.data && response.data.local_results && response.data.local_results.length > 0) {
      const result = response.data.local_results[0];
      return {
        title: result.title || '',
        address: result.address || '',
        rating: result.rating || null,
        reviews: result.reviews || 0,
        type: result.type || '',
        phone: result.phone || '',
        website: result.website || '',
        thumbnail: result.thumbnail || '',
        position: result.position || 1,
        gps_coordinates: result.gps_coordinates || null,
        place_id: result.place_id || '',
        data_id: result.data_id || ''
      };
    } else if (response.data && response.data.search_metadata) {
      return {
        title: query,
        address: query,
        rating: null,
        reviews: 0,
        type: 'Address',
        phone: '',
        website: '',
        thumbnail: '',
        position: 1,
        gps_coordinates: null,
        place_id: '',
        data_id: '',
        note: 'Location searched but no detailed results found'
      };
    }

    throw new Error('No location data found');
  } catch (error) {
    console.error('SerpAPI Error:', error.message);
    throw new Error(`Failed to fetch location data: ${error.message}`);
  }
};

module.exports = {
  searchLocation
};
