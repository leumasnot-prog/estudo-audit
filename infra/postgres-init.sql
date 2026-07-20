-- Executado só no primeiro boot do container (volume pgdata vazio).
-- auditor_ai já é criado via POSTGRES_DB; aqui criamos o banco da Evolution.
CREATE DATABASE evolution;
