CREATE DATABASE hosbank;
USE hosbank;


CREATE TABLE role (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nom VARCHAR(50) NOT NULL,
    description TEXT
);


CREATE TABLE Utilisateur (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    motDePass VARCHAR(255) NOT NULL,
    telephone VARCHAR(20),
    adresse TEXT,
    emailVerifie BOOLEAN DEFAULT FALSE,
    statut VARCHAR(50),
    roleId INT NOT NULL,
    FOREIGN KEY (roleId) REFERENCES role(id) ON DELETE RESTRICT ON UPDATE CASCADE
);


CREATE TABLE Réclamation (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sujet VARCHAR(255) NOT NULL,
    description TEXT,
    utilisateurId INT,
    FOREIGN KEY (utilisateurId) REFERENCES Utilisateur(id) ON DELETE CASCADE ON UPDATE CASCADE
);


CREATE TABLE Bénéficiaire (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nomComplet VARCHAR(200) NOT NULL,
    iban VARCHAR(34) NOT NULL,
    nomBanque VARCHAR(100),
    statut VARCHAR(50),
    clientId INT NOT NULL,
    dateAjout DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (clientId) REFERENCES Utilisateur(id) ON DELETE CASCADE ON UPDATE CASCADE
);


CREATE TABLE Compte_bancaire (
    id INT PRIMARY KEY AUTO_INCREMENT,
    numeroCompte VARCHAR(50) UNIQUE NOT NULL,
    iban VARCHAR(34) UNIQUE NOT NULL,
    typedecompte VARCHAR(50),
    solde DECIMAL(15, 2) DEFAULT 0.00,
    status VARCHAR(50),
    clientId INT NOT NULL,
    dateOuverture DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (clientId) REFERENCES Utilisateur(id) ON DELETE CASCADE ON UPDATE CASCADE
);


CREATE TABLE Carte_bancaire (
     id INT PRIMARY KEY AUTO_INCREMENT,
     numerodeCart VARCHAR(16) UNIQUE NOT NULL,
     dateExperation DATE NOT NULL,
     typeCarte VARCHAR(50),
     status VARCHAR(50),
     compteId INT NOT NULL,
     dateCreation DATETIME DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (compteId) REFERENCES `Compte bancaire`(id) ON DELETE CASCADE ON UPDATE CASCADE
);


CREATE TABLE Virement (
      id INT PRIMARY KEY AUTO_INCREMENT,
      reference VARCHAR(100) UNIQUE NOT NULL,
      montant DECIMAL(15, 2) NOT NULL,
      motif VARCHAR(255),
      statut VARCHAR(50),
      compteSourceId INT NOT NULL,
      beneficiaireId INT,
      dateCreation DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (compteSourceId) REFERENCES `Compte bancaire`(id) ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY (beneficiaireId) REFERENCES Bénéficiaire(id) ON DELETE SET NULL ON UPDATE CASCADE
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
     FOREIGN KEY (compteId) REFERENCES `Compte bancaire`(id) ON DELETE CASCADE ON UPDATE CASCADE,
     FOREIGN KEY (virmentId) REFERENCES Virement(id) ON DELETE SET NULL ON UPDATE CASCADE
);