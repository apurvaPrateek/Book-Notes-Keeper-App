import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import "dotenv/config";



const db = new pg.Client({
  // user: process.env.USER,
  // password: process.env.PG_PASSWORD,
  // host: process.env.HOST_NAME,
  // database: process.env.DATABASE,
  // port: process.env.PORT,
  connectionString: process.env.POSTGRES_URL
});
const PORT = process.env.PORT;


const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let reviews = [];

async function getReviews() {
  let result = await db.query("select * from book_reviews order by date desc");
  reviews = result.rows;
}

async function getReviewsSorted(sortBy){
    let result;
    
    if(sortBy=="title") result = await db.query("select * from book_reviews order by title");
    else if(sortBy=="newest") result = await db.query("select * from book_reviews order by date desc");
    else result = await db.query("select * from book_reviews order by rating desc");
    reviews = result.rows;
}

db.connect();




app.get("/", async (req, res) => {
  await getReviews();
  res.render("index.ejs", { reviews: reviews });
});




app.get("/add", (req, res) => {
  res.render("add.ejs", {
    item: { title: "", author: "", rating: "", isbn_id: "" },
  });
});

app.post("/add", async (req, res) => {
  let result = await db.query("select * from book_reviews where id=$1", [
    req.body.id,
  ]);
 
  res.render("add.ejs", { item: result.rows[0], reviewContent: req.body.reviewContent });
});

app.post("/submit-review", async (req, res) => {
    let status;
  const date = new Date();
  let day = date.getDate();
  let month = date.getMonth() + 1;
  let year = date.getFullYear();
  let currentDate = `${day}-${month}-${year}`;
  if (req.body.id) {
    status="updated";
    await db.query(
      "update book_reviews set title=$1, author=$2, review=$3, rating=$4, isbn_id=$5, date=$6 where id=$7",
      [
        req.body.title,
        req.body.author,
        req.body.review,
        req.body.rating,
        req.body.isbn_id,
        currentDate,
        req.body.id,
      ]
    );
  } else {
    status="add";
    let result = await db.query(
      "insert into book_reviews (title, author, review, rating, isbn_id, date) values ($1, $2, $3, $4, $5, $6) returning *;",
      [
        req.body.title,
        req.body.author,
        req.body.review,
        req.body.rating,
        req.body.isbn_id,
        currentDate,
      ]
    );
    console.log(result.rows[0]);
  }
  await getReviews();
  res.render("index.ejs", {reviews: reviews, status: status});
});

app.post("/delete", async (req, res) => {
  await db.query("delete from book_reviews where id=$1", [req.body.id]);

  await getReviews();
  res.render("index.ejs", {reviews: reviews, status: "delete"});
});

app.post("/sort",async (req, res)=>{
  
    await getReviewsSorted(req.body.sortBy);
    
    res.render("index.ejs", { reviews: reviews });
})

app.listen(PORT, () => {
  console.log(`The app is listening at port ${PORT}`);
});
