import express from "express";
import mysql from "mysql2";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Connect to MySQL
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "BeBackNever@11",
  database: "smart_doc_assistant"
});

db.connect(err => {
  if (err) {
    console.error("❌ Database connection failed:", err);
  } else {
    console.log("✅ Connected to MySQL Database");
  }
});

app.use('/uploads', express.static('uploads'));

// Example: test route
app.get("/", (req, res) => {
  res.send("Server is running and uploads are accessible.");
});

// ✅ Valid tables mapping
const validDocs = {
  AadharCard: "aadhar_card",
  Passport: "passport",
  PanCard: "pan_card",
  DrivingLicense: "driving_license",
  FlightTicket: "flight_ticket"
};

// ✅ POST endpoint to update documents in correct table
app.post("/update-document", (req, res) => {
  try {
    const { docType, fields } = req.body;
    const tableName = validDocs[docType];

    if (!tableName) {
      return res.status(400).json({ message: "Invalid document type" });
    }

    console.log("--- Received Fields ---");
    console.log(fields);

    // 🔹 Declare user info variables
    let FirstName = "";
    let MiddleName = "";
    let LastName = "";
    let DOB = "";

    // 🧭 Normalize if document is a Passport
    if (docType === "Passport") {
      FirstName = fields["Given names"] || "";
      MiddleName = "";
      LastName = fields["Surname"] || "";
      DOB = fields["Date of birth"] || "";
    } else {
      // For other docs, use the field names directly
      FirstName = fields.FirstName || "";
      MiddleName = fields.MiddleName || "";
      LastName = fields.LastName || "";
      DOB = fields.DOB || "";
    }

    if (!FirstName || !LastName || !DOB) {
      return res.status(400).json({
        message: "Missing user identification fields (FirstName, LastName, DOB)"
      });
    }

    console.log(`🧍 User Info:
      FirstName: ${FirstName},
      MiddleName: ${MiddleName},
      LastName: ${LastName},
      DOB: ${DOB}
    `);

    // Step 1️⃣: Check if user already exists
    const checkUserQuery = `
      SELECT userID FROM users
      WHERE firstName = ? AND middleName = ? AND lastName = ? AND dob = ?
    `;

    db.query(
      checkUserQuery,
      [FirstName, MiddleName || "", LastName, DOB],
      (err, results) => {
        if (err) {
          console.error("Error checking user:", err);
          return res.status(500).json({ message: "Database error during user check" });
        }

        if (results.length > 0) {
          // ✅ User exists — use existing ID
          const userID = results[0].userID;
          console.log(`✅ Existing user found: ID ${userID}`);
          insertOrUpdateDocument(userID);
        } else {
          // 🆕 User does not exist — insert new record
          const insertUserQuery = `
            INSERT INTO users (firstName, middleName, lastName, dob)
            VALUES (?, ?, ?, ?)
          `;
          db.query(
            insertUserQuery,
            [FirstName, MiddleName || "", LastName, DOB],
            (err2, insertResult) => {
              if (err2) {
                console.error("Error creating user:", err2);
                return res.status(500).json({ message: "Failed to create new user" });
              }
              const newUserID = insertResult.insertId;
              console.log(`🆕 New user created with ID: ${newUserID}`);
              insertOrUpdateDocument(newUserID);
            }
          );
        }
      }
    );

    // Step 2️⃣: Insert or update document for user
    function insertOrUpdateDocument(userID) {
      console.log(`🧾 Inserting/updating document for userID: ${userID}`);

      const query = `
        INSERT INTO ${tableName} (userID, fields)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE
          fields = VALUES(fields),
          uploaded_at = CURRENT_TIMESTAMP
      `;

      db.query(query, [userID, JSON.stringify(fields)], (err3) => {
        if (err3) {
          console.error("Error inserting/updating document:", err3);
          return res.status(500).json({ message: "Failed to update document table" });
        }

        console.log(`✅ ${docType} fields updated successfully for userID ${userID}`);
        res.json({
          message: `${docType} fields updated successfully`,
          userID
        });
      });
    }
  } catch (err) {
    console.error("🔥 Unexpected server error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.listen(5000, () => console.log("Node.js server running on port 5000"));
