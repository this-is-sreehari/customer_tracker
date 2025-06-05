# Customer Tracker

Track purchase history of similar customers and group them together.

## API Documentation
- The URL is `https://customer-tracker.onrender.com/identify`.
- The `/identify` is the primary endpoint and can receive both `GET` and `POST` requests.
- Add `Content-Type: application/json` to headers for sending `JSON` in request body. 
- An example of a sample request body is given below.

```
{
    "email": "mcfly@hillvalley.edu",
    "phoneNumber": "293-408-6001"
}
```
>Both email and phoneNumber fields are of type String and can be null.
- Returns `200 OK` as status for successful  `GET` and `POST` requests.
- An example of a sample response body is given below.
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

- NodeJS + ExpressJS + TypeScript is used for backend service.
- MySQL is used as the Database.
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
