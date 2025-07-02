'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type AuthMode = 'login' | 'signup' | 'recover';

const AuthCard = () => {
  const [mode, setMode] = useState<AuthMode>('login');

  const renderForm = () => {
    switch (mode) {
      case 'login':
        return <LoginForm setMode={setMode} />;
      case 'signup':
        return <SignUpForm setMode={setMode} />;
      case 'recover':
        return <PasswordRecoveryForm setMode={setMode} />;
      default:
        return null;
    }
  };

  return (
    <Card className="w-[400px] bg-gray-800/60 backdrop-blur-sm border-gray-700 text-white">
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
        >
          {renderForm()}
        </motion.div>
      </AnimatePresence>
    </Card>
  );
};

const LoginForm = ({ setMode }: { setMode: (mode: AuthMode) => void }) => (
  <>
    <CardHeader>
      <CardTitle>Login</CardTitle>
      <CardDescription>Acesse sua conta para continuar</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="seu@email.com" className="bg-gray-900 border-gray-600" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input id="password" type="password" placeholder="********" className="bg-gray-900 border-gray-600" />
      </div>
      <Button className="w-full bg-blue-600 hover:bg-blue-700">Entrar</Button>
      <div className="text-center text-sm text-gray-400">
        <button onClick={() => setMode('recover')} className="hover:underline">Esqueceu a senha?</button>
        <span className="mx-2">|</span>
        <button onClick={() => setMode('signup')} className="hover:underline">Criar conta</button>
      </div>
    </CardContent>
  </>
);

const SignUpForm = ({ setMode }: { setMode: (mode: AuthMode) => void }) => (
  <>
    <CardHeader>
      <CardTitle>Criar Conta</CardTitle>
      <CardDescription>Crie uma nova conta para acessar a plataforma</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" type="text" placeholder="Seu Nome" className="bg-gray-900 border-gray-600" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="seu@email.com" className="bg-gray-900 border-gray-600" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input id="password" type="password" placeholder="********" className="bg-gray-900 border-gray-600" />
      </div>
      <Button className="w-full bg-blue-600 hover:bg-blue-700">Criar Conta</Button>
      <div className="text-center text-sm text-gray-400">
        <span>Já tem uma conta? </span>
        <button onClick={() => setMode('login')} className="hover:underline">Faça login</button>
      </div>
    </CardContent>
  </>
);

const PasswordRecoveryForm = ({ setMode }: { setMode: (mode: AuthMode) => void }) => (
  <>
    <CardHeader>
      <CardTitle>Recuperar Senha</CardTitle>
      <CardDescription>Enviaremos um link de recuperação para seu email</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="seu@email.com" className="bg-gray-900 border-gray-600" />
      </div>
      <Button className="w-full bg-blue-600 hover:bg-blue-700">Enviar Link</Button>
      <div className="text-center text-sm text-gray-400">
        <button onClick={() => setMode('login')} className="hover:underline">Voltar para o login</button>
      </div>
    </CardContent>
  </>
);

export default AuthCard;
