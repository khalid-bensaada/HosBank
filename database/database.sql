CREATE DATABASE IF NOT EXISTS hosbank;

USE hosbank;


CREATE TABLE role (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nom VARCHAR(50) NOT NULL,
    description TEXT
);


CREATE TABLE utilisateur (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    motDePass VARCHAR(255) NOT NULL,
    telephone VARCHAR(20),
    adresse TEXT,
    emailVerifie BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(64),
    statut VARCHAR(50),
    roleId INT NOT NULL,
    FOREIGN KEY (roleId) REFERENCES role(id) ON DELETE RESTRICT ON UPDATE CASCADE
);


CREATE TABLE réclamation (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sujet VARCHAR(255) NOT NULL,
    description TEXT,
    statut VARCHAR(50) DEFAULT 'En attente',
    dateCreation DATETIME DEFAULT CURRENT_TIMESTAMP,
    utilisateurId INT,
    FOREIGN KEY (utilisateurId) REFERENCES utilisateur(id) ON DELETE CASCADE ON UPDATE CASCADE
);


CREATE TABLE beneficiaries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    iban VARCHAR(34) NOT NULL,
    bank_name VARCHAR(100),
    user_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_iban (user_id, iban),
    FOREIGN KEY (user_id) REFERENCES utilisateur(id) ON DELETE CASCADE
);
CREATE TABLE `compte_bancaire` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    numeroCompte VARCHAR(50) UNIQUE NOT NULL,
    iban VARCHAR(34) UNIQUE NOT NULL,
    typedecompte VARCHAR(50),
    solde DECIMAL(15, 2) DEFAULT 0.00,
    status VARCHAR(50),
    clientId INT NOT NULL,
    dateOuverture DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (clientId) REFERENCES utilisateur(id) ON DELETE CASCADE ON UPDATE CASCADE
);


CREATE TABLE `Carte bancaire` (
     id INT PRIMARY KEY AUTO_INCREMENT,
     numerodeCart VARCHAR(16) UNIQUE NOT NULL,
     dateExperation DATE NOT NULL,
     typeCarte VARCHAR(50),
     status VARCHAR(50),
     compteId INT NOT NULL,
     dateCreation DATETIME DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (compteId) REFERENCES `compte_bancaire`(id) ON DELETE CASCADE ON UPDATE CASCADE
);


CREATE TABLE virement (
      id INT PRIMARY KEY AUTO_INCREMENT,
      reference VARCHAR(100) UNIQUE NOT NULL,
      montant DECIMAL(15, 2) NOT NULL,
      motif VARCHAR(255),
      statut VARCHAR(50),
      compteSourceId INT NOT NULL,
      beneficiaireId INT,
      compteDestId INT,
      FOREIGN KEY (compteDestId) REFERENCES compte_bancaire(id) ON DELETE SET NULL,
      dateCreation DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (compteSourceId) REFERENCES `compte_bancaire`(id) ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY (beneficiaireId) REFERENCES beneficiaries(id) ON DELETE SET NULL ON UPDATE CASCADE
);


CREATE TABLE Opération (
     id INT PRIMARY KEY AUTO_INCREMENT,
     typeOperation VARCHAR(50) NOT NULL,
     montant DECIMAL(15, 2) NOT NULL,
     soldeAvant DECIMAL(15, 2),
     soldeApres DECIMAL(15, 2),
     description VARCHAR(255),
     compteId INT NOT NULL,
     virmentId INT,
     dateOperation DATE DEFAULT (CURRENT_DATE),
     FOREIGN KEY (compteId) REFERENCES `compte_bancaire`(id) ON DELETE CASCADE ON UPDATE CASCADE,
     FOREIGN KEY (virmentId) REFERENCES virement(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    from_account_id INT NOT NULL,
    to_account_id INT,
    beneficiary_name VARCHAR(200),
    amount DECIMAL(15, 2) NOT NULL,
    type VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    reference VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_account_id) REFERENCES compte_bancaire(id),
    FOREIGN KEY (to_account_id) REFERENCES compte_bancaire(id)
);

INSERT INTO role (id, nom, description) VALUES (1, 'client', 'Client HosBank');