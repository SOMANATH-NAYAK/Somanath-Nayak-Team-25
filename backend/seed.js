const { createClient } = require('redis');

// 1. Define our mock data
const mockProducts = [
    { id: '101', name: 'Wireless Noise-Canceling Headphones', price: '199.99', category: 'Electronics', stock: '50' },
    { id: '102', name: 'Ergonomic Office Chair', price: '249.50', category: 'Furniture', stock: '15' },
    { id: '103', name: 'Mechanical Keyboard (Cherry MX)', price: '120.00', category: 'Electronics', stock: '85' },
    { id: '104', name: 'Stainless Steel Water Bottle', price: '25.00', category: 'Accessories', stock: '200' },
    { id: '105', name: 'Standing Desk Converter', price: '150.00', category: 'Furniture', stock: '10' }
];

async function seedDatabase() {
    // 2. Connect to Valkey (running locally on port 6379)
    const client = createClient({
        url: 'redis://localhost:6379'
    });

    client.on('error', (err) => console.error('Valkey Client Error:', err));

    try {
        await client.connect();
        console.log('✅ Connected to Valkey');

        // Optional: Clear the database before seeding so we have a clean slate
        await client.flushDb();
        console.log('🧹 Cleared existing database');

        // 3. Insert each product as a Hash
        for (const product of mockProducts) {
            const key = `product:${product.id}`;

            // hSet takes the key, and an object of fields/values to store
            await client.hSet(key, {
                name: product.name,
                price: product.price,
                category: product.category,
                stock: product.stock
            });

            console.log(`📦 Inserted: ${key} - ${product.name}`);
        }

        console.log('🎉 Seeding complete!');

    } catch (error) {
        console.error('❌ Error during seeding:', error);
    } finally {
        // 4. Always close the connection when done
        await client.quit();
    }
}

// Run the function
seedDatabase();