class ApiService {
    constructor() {
        this.baseUrl = '/api';
    }

    async fetchData(endpoint, params = {}) {
        try {
            const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin);
            Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Failed to fetch ${endpoint}:`, error);
            return [];
        }
    }

    async getStartups(filters = {}) {
        return this.fetchData('/startups', filters);
    }

    async getTeams() {
        return this.fetchData('/teams');
    }

    async getSpecialists(filters = {}) {
        return this.fetchData('/specialists', filters);
    }

    async getEvents() {
        return this.fetchData('/events');
    }

    async getAllData() {
        return this.fetchData('/data');
    }
}

window.apiService = new ApiService();
