CREATE DATABASE IF NOT EXISTS anirory
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE anirory;

CREATE TABLE IF NOT EXISTS books (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT ck_books_price_positive CHECK (price > 0),
  UNIQUE KEY uq_books_seed_identity (title, author),
  INDEX ix_books_category_price (category, price),
  INDEX ix_books_title (title),
  INDEX ix_books_author (author),
  INDEX ix_books_available (available)
) ENGINE=InnoDB;
