-- Papel do usuário. Todo mundo que já existe continua como USER: a promoção
-- do primeiro administrador é feita de propósito fora daqui, pelo script
-- `npm run admin:create`, pra que nenhuma credencial fique versionada.
ALTER TABLE `users` ADD COLUMN `role` ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER';
