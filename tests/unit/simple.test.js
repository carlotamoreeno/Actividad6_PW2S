describe('Prueba de funcionamiento básico de Jest', () => {
  test('Debería funcionar la suma básica', () => {
    expect(1 + 1).toBe(2);
  });
  
  test('Debería funcionar', () => {
    expect('hola').toBe('hola');
  });
}); 