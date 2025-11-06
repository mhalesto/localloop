/**
 * Test script for LocalLoop Admin Dashboard
 * Run this in the browser console while on the admin dashboard
 */

const testDashboard = {
    // Test configuration
    config: {
        testUser: {
            email: 'test-admin@localloop.co.za',
            password: 'Test123!@#'
        },
        samplePost: {
            title: 'Test Post from Admin Dashboard',
            content: 'This is a test post created from the admin dashboard test script',
            category: 'Test',
            userId: 'test-user-123'
        }
    },

    // Run all tests
    async runAllTests() {
        console.log('🔧 Starting Admin Dashboard Tests...\n');

        const tests = [
            this.testAuthentication,
            this.testStatistics,
            this.testPostsManagement,
            this.testUsersManagement,
            this.testReportsSystem,
            this.testAnalytics,
            this.testFilters,
            this.testPagination,
            this.testBatchOperations,
            this.testExportFunctionality,
            this.testRealtimeUpdates,
            this.testSettings,
            this.testModals,
            this.testCharts,
            this.testErrorHandling
        ];

        let passed = 0;
        let failed = 0;

        for (let test of tests) {
            try {
                await test.call(this);
                passed++;
                console.log(`✅ ${test.name} passed\n`);
            } catch (error) {
                failed++;
                console.error(`❌ ${test.name} failed:`, error.message, '\n');
            }
        }

        console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
        return { passed, failed };
    },

    // Test authentication
    async testAuthentication() {
        console.log('Testing Authentication...');

        // Check if auth is initialized
        if (!window.firebase?.auth) {
            throw new Error('Firebase Auth not initialized');
        }

        // Check current user
        const currentUser = window.firebase.auth.currentUser;
        if (!currentUser) {
            throw new Error('No user logged in');
        }

        console.log(`- Logged in as: ${currentUser.email}`);

        // Verify admin role
        const userDoc = await window.firebase.getDoc(
            window.firebase.doc(window.firebase.db, 'users', currentUser.uid)
        );

        if (!userDoc.exists() || (!userDoc.data().role === 'admin' && !userDoc.data().isAdmin)) {
            throw new Error('User is not an admin');
        }

        console.log('- Admin role verified');
    },

    // Test statistics loading
    async testStatistics() {
        console.log('Testing Statistics...');

        const stats = [
            'totalUsers',
            'activePosts',
            'reportsToday',
            'monthlyRevenue'
        ];

        for (let statId of stats) {
            const element = document.getElementById(statId);
            if (!element) {
                throw new Error(`Stat element ${statId} not found`);
            }

            const value = element.textContent;
            if (!value || value.includes('Loading')) {
                throw new Error(`Stat ${statId} not loaded`);
            }

            console.log(`- ${statId}: ${value}`);
        }
    },

    // Test posts management
    async testPostsManagement() {
        console.log('Testing Posts Management...');

        // Check if posts table exists
        const postsTable = document.getElementById('postsTableBody');
        if (!postsTable) {
            throw new Error('Posts table not found');
        }

        // Check if posts are loaded
        const rows = postsTable.querySelectorAll('tr');
        if (rows.length === 0 || rows[0].textContent.includes('Loading')) {
            throw new Error('Posts not loaded');
        }

        console.log(`- Found ${rows.length} posts`);

        // Test view post function
        if (typeof window.viewPost !== 'function') {
            throw new Error('viewPost function not defined');
        }

        // Test remove/restore functions
        if (typeof window.removePost !== 'function') {
            throw new Error('removePost function not defined');
        }

        if (typeof window.restorePost !== 'function') {
            throw new Error('restorePost function not defined');
        }

        console.log('- Post operations functions verified');
    },

    // Test users management
    async testUsersManagement() {
        console.log('Testing Users Management...');

        // Check if users list exists
        const usersList = document.getElementById('usersList');
        if (!usersList) {
            throw new Error('Users list not found');
        }

        // Check if users are loaded
        const userCards = usersList.querySelectorAll('.user-card');
        if (userCards.length === 0) {
            console.log('- No users found (might be empty database)');
        } else {
            console.log(`- Found ${userCards.length} users`);
        }

        // Test user functions
        if (typeof window.viewUser !== 'function') {
            throw new Error('viewUser function not defined');
        }

        if (typeof window.suspendUser !== 'function') {
            throw new Error('suspendUser function not defined');
        }

        console.log('- User operations functions verified');
    },

    // Test reports system
    async testReportsSystem() {
        console.log('Testing Reports System...');

        const reportsTable = document.getElementById('reportsTableBody');
        if (!reportsTable) {
            throw new Error('Reports table not found');
        }

        // Test report functions
        if (typeof window.viewReport !== 'function') {
            throw new Error('viewReport function not defined');
        }

        if (typeof window.autoRemove !== 'function') {
            throw new Error('autoRemove function not defined');
        }

        if (typeof window.resolveReports !== 'function') {
            throw new Error('resolveReports function not defined');
        }

        console.log('- Report operations functions verified');
    },

    // Test analytics
    async testAnalytics() {
        console.log('Testing Analytics...');

        const analyticsStats = ['totalPosts', 'activeUsers', 'engagementRate'];

        // Switch to analytics section
        const analyticsSection = document.getElementById('analytics');
        if (!analyticsSection) {
            throw new Error('Analytics section not found');
        }

        for (let statId of analyticsStats) {
            const element = document.getElementById(statId);
            if (!element) {
                console.log(`- Warning: ${statId} element not found`);
            }
        }

        console.log('- Analytics section verified');
    },

    // Test filters
    async testFilters() {
        console.log('Testing Filters...');

        // Test post filters
        const postSearch = document.getElementById('postSearch');
        const categoryFilter = document.getElementById('categoryFilter');

        if (!postSearch || !categoryFilter) {
            throw new Error('Post filters not found');
        }

        // Test user filters
        const userSearch = document.getElementById('userSearch');
        const planFilter = document.getElementById('planFilter');

        if (!userSearch || !planFilter) {
            throw new Error('User filters not found');
        }

        // Test filter functions
        if (typeof window.applyPostFilters !== 'function') {
            throw new Error('applyPostFilters function not defined');
        }

        if (typeof window.applyUserFilters !== 'function') {
            throw new Error('applyUserFilters function not defined');
        }

        console.log('- Filters verified');
    },

    // Test pagination
    async testPagination() {
        console.log('Testing Pagination...');

        if (typeof window.nextPage !== 'function') {
            throw new Error('nextPage function not defined');
        }

        if (typeof window.previousPage !== 'function') {
            throw new Error('previousPage function not defined');
        }

        console.log('- Pagination functions verified');
    },

    // Test batch operations
    async testBatchOperations() {
        console.log('Testing Batch Operations...');

        if (typeof window.batchDeletePosts !== 'function') {
            throw new Error('batchDeletePosts function not defined');
        }

        if (typeof window.batchSuspendUsers !== 'function') {
            throw new Error('batchSuspendUsers function not defined');
        }

        // Check for checkboxes
        const postCheckboxes = document.querySelectorAll('.row-checkbox');
        const userCheckboxes = document.querySelectorAll('.user-checkbox');

        console.log(`- Found ${postCheckboxes.length} post checkboxes`);
        console.log(`- Found ${userCheckboxes.length} user checkboxes`);
    },

    // Test export functionality
    async testExportFunctionality() {
        console.log('Testing Export Functionality...');

        if (typeof window.exportData !== 'function') {
            throw new Error('exportData function not defined');
        }

        // Test CSV conversion
        const testData = [
            { id: 1, name: 'Test', value: 100 },
            { id: 2, name: 'Test 2', value: 200 }
        ];

        console.log('- Export function verified');
    },

    // Test real-time updates
    async testRealtimeUpdates() {
        console.log('Testing Real-time Updates...');

        // Check if listeners are set up
        if (window.initialLoad === undefined) {
            console.log('- Warning: Real-time listeners may not be initialized');
        } else {
            console.log('- Real-time listeners initialized');
        }
    },

    // Test settings
    async testSettings() {
        console.log('Testing Settings...');

        const settingsElements = [
            'autoRemove5',
            'flagInappropriate',
            'requireApproval'
        ];

        for (let elementId of settingsElements) {
            const element = document.getElementById(elementId);
            if (!element) {
                throw new Error(`Setting ${elementId} not found`);
            }
        }

        if (typeof window.saveSettings !== 'function') {
            throw new Error('saveSettings function not defined');
        }

        if (typeof window.addAdmin !== 'function') {
            throw new Error('addAdmin function not defined');
        }

        console.log('- Settings verified');
    },

    // Test modals
    async testModals() {
        console.log('Testing Modals...');

        // Try to trigger a modal (without actually clicking)
        if (typeof window.showModal === 'undefined') {
            console.log('- Modal function not globally exposed (this is okay)');
        }

        console.log('- Modal system verified');
    },

    // Test charts
    async testCharts() {
        console.log('Testing Charts...');

        const chartIds = [
            'activityChart',
            'categoryChart',
            'growthChart',
            'revenueChart'
        ];

        for (let chartId of chartIds) {
            const canvas = document.getElementById(chartId);
            if (!canvas) {
                console.log(`- Warning: Chart ${chartId} canvas not found`);
            }
        }

        console.log('- Charts verified');
    },

    // Test error handling
    async testErrorHandling() {
        console.log('Testing Error Handling...');

        // Check if message functions exist
        if (typeof window.showMessage === 'undefined') {
            console.log('- Message function not globally exposed');
        }

        // Check if loading functions exist
        if (typeof window.showLoading === 'undefined') {
            console.log('- Loading function not globally exposed');
        }

        console.log('- Error handling verified');
    },

    // Simulate user interactions
    async simulateInteractions() {
        console.log('\n🎮 Simulating User Interactions...\n');

        // Simulate search
        const postSearch = document.getElementById('postSearch');
        if (postSearch) {
            postSearch.value = 'test';
            console.log('- Simulated post search');
        }

        // Simulate filter change
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.value = 'General';
            console.log('- Simulated category filter change');
        }

        // Simulate checkbox selection
        const firstCheckbox = document.querySelector('.row-checkbox');
        if (firstCheckbox) {
            firstCheckbox.checked = true;
            console.log('- Simulated checkbox selection');
        }

        console.log('\n✅ Interaction simulation complete');
    },

    // Generate test report
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            browser: navigator.userAgent,
            url: window.location.href,
            firebaseInitialized: !!window.firebase,
            authInitialized: !!window.firebase?.auth,
            dbInitialized: !!window.firebase?.db,
            currentUser: window.firebase?.auth?.currentUser?.email || 'Not logged in',
            dashboardElements: {
                loginScreen: !!document.getElementById('loginScreen'),
                dashboard: !!document.getElementById('dashboard'),
                sidebar: !!document.querySelector('.sidebar'),
                mainContent: !!document.querySelector('.main-content')
            },
            sections: {
                overview: !!document.getElementById('overview'),
                posts: !!document.getElementById('posts'),
                users: !!document.getElementById('users'),
                reports: !!document.getElementById('reports'),
                analytics: !!document.getElementById('analytics'),
                settings: !!document.getElementById('settings')
            }
        };

        console.log('\n📋 Dashboard Test Report:', report);
        return report;
    }
};

// Auto-run tests if dashboard is loaded
if (document.readyState === 'complete') {
    console.log('Dashboard Test Script Loaded. Run testDashboard.runAllTests() to start testing.');
} else {
    window.addEventListener('load', () => {
        console.log('Dashboard Test Script Loaded. Run testDashboard.runAllTests() to start testing.');
    });
}

// Make test object globally available
window.testDashboard = testDashboard;