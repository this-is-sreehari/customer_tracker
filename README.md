# Customer Tracker

Track purchase history of similar customers and group them together.

## API Documentation
- The API is accessible at: `https://customer-tracker.onrender.com/identify`.
> **Note**: The API may take a few seconds to respond on the first request, as the host Render will put the service to sleep after 15 minutes of inactivity (free plan limitation).
- The `/identify` endpoint supports HTTP `GET` and `POST` requests.
- Additionally, there is an HTTP `DELETE` endpoint with the format  `/identify/{id}`
- Add `Content-Type: application/json` to headers for sending `JSON` in request body. 
- Returns `200 OK` for successful `GET` and `POST` requests, and `204 No Content` for successful `DELETE` requests.
- A sample request body is shown below.

```
{
    "email": "mcfly@hillvalley.edu",
    "phoneNumber": "293-408-6001"
}
```
>Both email and phoneNumber fields are of type String and can be null.

- A sample response body is shown below.
```
{
    "contact": {
        "primaryContatctId": 1,
        "emails": ["mcfly@hillvalley.edu", "Noemy.Willms38@hotmail.com"],
        "phoneNumbers": ["293-408-6001"],
        "secondaryContactIds": [2]
    }
}
```
## Tech Stack Used

- NodeJS with ExpressJS and TypeScript for the backend service.
- MySQL as the Database.
- API hosted on **Render.com**.
- Database hosted on **Aiven.io**.

## Local Installation

### Step 1
```bash
git clone https://github.com/this-is-sreehari/customer_tracker.git
cd customer_tracker
```
> Note: After cloning the repo, make sure to comment the 'ca' object and 'ssl' field of connection object in 'db.ts' file as it is necessary only when connecting to a remote DB. For local development both the fields are un-necessary.

> Note: Create a '.env' file in root folder and populate it with fields necessary for DB connection.

### Step 2
```bash
npm install
npm run build
npm run dev
```
