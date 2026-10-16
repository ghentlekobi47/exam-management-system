# CampusIQ

**Online exams for courses, lecturers and students.** Lecturers build timed multiple-choice and true/false exams (or import them from a spreadsheet), students take them in the browser, and CampusIQ marks every paper the moment it's handed in.

🔗 **Live demo:** _add your Vercel link here_ · 📦 **Deployment guide:** [DEPLOYMENT.md](DEPLOYMENT.md)

<!-- Screenshots: save images in docs/screenshots/ and uncomment
![Taking an exam](docs/screenshots/take-exam.png)
![Lecturer results](docs/screenshots/results.png)
-->

---

## Features

**Students**
- Sign up with email verification (6-digit code by email)
- See their courses and published exams
- Take timed exams: answers save as they click, a countdown hands the exam in automatically, and refreshing the page loses nothing
- See their score and pass/fail straight away (correct answers stay hidden)
- "My results" across all courses

**Lecturers**
- Create exams with a schedule (open and close date and time), time limit, attempts and pass mark
- Add true/false and multiple-choice questions, or **import them from a spreadsheet saved as CSV**
- Publish and close exams (published exams are locked so every student gets the same paper)
- Enroll students by email
- Class results: average, highest and lowest, pass rate, each student's marked paper, and **CSV export**

**Admins**
- Create lecturer, student and admin accounts; change roles; deactivate accounts
- Create courses and assign lecturers

**Everyone**
- Sign-in tabs per role, show/hide password, profile page with name and password change (other devices are signed out on a password change)

## Tech stack

| Part | Built with |
|---|---|
| Website | React 19, React Router, Vite, Tailwind CSS v4 |
| API | Node.js, Express 5, Zod validation, JWT sign-in, bcrypt |
| Database | MySQL with Sequelize (models + migrations) |
| Email | Brevo (SMTP locally, web API in production) |
| Security | Helmet headers, per-account sign-in limits, server-side answer hiding |
| Tests | Node's built-in test runner: unit tests + database integration tests |

## Run it locally

You need **Node.js 20+** and **MySQL 8**.

```bash
# 1. Install everything
npm run install:all

# 2. Settings: copy the examples, then fill in your MySQL password
#    and a long random JWT_SECRET
cp server/.env.example server/.env
cp client/.env.example client/.env

# 3. Create the database tables
cd server
npm run db:migrate

# 4. Create your admin account
npm run create-admin -- "Your Name" you@example.com "AStrongPassword1!"

# 5. (Optional) Demo data: a lecturer, 3 students, a course and a quiz
npm run db:seed
cd ..

# 6. Start the API and the website together
npm run dev
```

Open **http://localhost:5173**. Without email settings, verification codes are printed in the terminal instead of emailed.

### Demo accounts (after `npm run db:seed`)

| Role | Email | Password |
|---|---|---|
| Lecturer | `lecturer@campusiq.test` | `Password123!` |
| Student (enrolled in CS101) | `student1@campusiq.test` | `Password123!` |
| Student (not enrolled) | `student3@campusiq.test` | `Password123!` |

> ⚠️ These passwords are public, so use demo data for local testing and demos only, never for real exams.

## Scripts

Run from the project root unless noted.

| Command | What it does |
|---|---|
| `npm run dev` | Starts the API (port 5000) and website (port 5173) together |
| `npm test` | Unit tests (no database needed) |
| `npm run test:integration` | Database tests on a throwaway `campusiq_test` database |
| `npm run lint` | Checks the website code |
| `npm run db:migrate` (in `server/`) | Creates or updates the database tables |
| `npm run create-admin -- "Name" email "password"` (in `server/`) | Creates an admin account |
| `npm run db:seed` / `db:seed:undo` (in `server/`) | Adds or removes the demo data |

## Project structure

```
client/                 React website
  src/pages/            one file per screen (dashboard, exam, take exam, results…)
  src/components/       shared UI (forms, dialogs, profile menu…)
server/                 Express API
  src/modules/          auth, users, courses, exams, attempts
  src/database/         migrations and demo seeders
  tests/                unit tests; tests/integration for database tests
DEPLOYMENT.md           free hosting guide (Vercel + Render + Aiven + Brevo)
```

## Importing questions

On a draft exam, choose **Import from CSV** and download the template. One question per row:

| type | question | points | option_a … option_f | correct |
|---|---|---|---|---|
| `multiple_choice` | Which is an input device? | 2 | Monitor, Keyboard, Printer | `B` |
| `true_false` | The CPU is the brain of the computer. | 1 | (empty) | `TRUE` |

Every row is checked first: if any row is wrong, nothing is imported and each problem is listed by row number.
