# Kitesurfing Tour Operator Database App

A simple, modern database application for managing a kitesurfing tour operator business. Manage clients, hotels, trips, and bookings all in one place.

## Features

- **Clients Management**: Add, edit, and delete client information (name, email, phone, address)
- **Hotels Management**: Manage hotel details including location, rating, and capacity
- **Trips Management**: Create and manage kitesurfing trips with dates, pricing, and hotel associations
- **Bookings Management**: Track bookings linking clients to trips with status tracking

## Tech Stack

- **Frontend**: React 18 with modern CSS
- **Backend**: Node.js with Express
- **Database**: SQLite (easy to set up, can be upgraded to PostgreSQL)
- **API**: RESTful API with CORS support

## Installation

1. **Navigate to the project directory:**
   ```bash
   cd C:\kitesurfing-tour-operator
   ```

2. **Install all dependencies:**
   ```bash
   npm run install-all
   ```

   Or install manually:
   ```bash
   npm install
   cd server && npm install
   cd ../client && npm install
   ```

## Running the Application

### Development Mode (runs both server and client)

From the project root directory:
```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:5000`
- Frontend React app on `http://localhost:3000`

### Run Separately

**Backend only:**
```bash
npm run server
```

**Frontend only:**
```bash
npm run client
```

## Project Structure

```
kitesurfing-tour-operator/
├── server/
│   ├── index.js          # Express server and API routes
│   ├── database.js       # Database initialization and schema
│   ├── package.json
│   └── kitesurfing.db    # SQLite database (created automatically)
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Clients.js
│   │   │   ├── Hotels.js
│   │   │   ├── Trips.js
│   │   │   ├── Bookings.js
│   │   │   └── Table.css
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
├── package.json
└── README.md
```

## API Endpoints

### Clients
- `GET /api/clients` - Get all clients
- `GET /api/clients/:id` - Get a specific client
- `POST /api/clients` - Create a new client
- `PUT /api/clients/:id` - Update a client
- `DELETE /api/clients/:id` - Delete a client

### Hotels
- `GET /api/hotels` - Get all hotels
- `GET /api/hotels/:id` - Get a specific hotel
- `POST /api/hotels` - Create a new hotel
- `PUT /api/hotels/:id` - Update a hotel
- `DELETE /api/hotels/:id` - Delete a hotel

### Trips
- `GET /api/trips` - Get all trips
- `GET /api/trips/:id` - Get a specific trip
- `POST /api/trips` - Create a new trip
- `PUT /api/trips/:id` - Update a trip
- `DELETE /api/trips/:id` - Delete a trip

### Bookings
- `GET /api/bookings` - Get all bookings
- `GET /api/bookings/:id` - Get a specific booking
- `POST /api/bookings` - Create a new booking
- `PUT /api/bookings/:id` - Update a booking
- `DELETE /api/bookings/:id` - Delete a booking

## Database Schema

The SQLite database includes the following tables:
- **clients**: Client information
- **hotels**: Hotel details
- **trips**: Trip information with hotel references
- **bookings**: Booking records linking clients to trips

## Usage

1. Start the application using `npm run dev`
2. Open your browser to `http://localhost:3000`
3. Navigate between tabs (Clients, Hotels, Trips, Bookings)
4. Use the "Add" buttons to create new entries
5. Click "Edit" to modify existing entries
6. Click "Delete" to remove entries (with confirmation)

## Future Enhancements

- User authentication
- Advanced search and filtering
- Reports and analytics
- Email notifications
- Payment tracking
- Calendar view for trips
- Export to CSV/PDF

## License

MIT

