import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Cliente } from '../entities/cliente.entity';
import { CreateClienteDto, UpdateClienteDto } from './dto/cliente.dto';

@Injectable()
export class ClienteService {
  constructor(
    @InjectRepository(Cliente)
    private clienteRepository: Repository<Cliente>,
  ) {}

  async create(dto: CreateClienteDto): Promise<Cliente> {
    const cliente = this.clienteRepository.create({
      nombre: dto.nombre.trim(),
      telefono: dto.telefono?.trim() || null,
      email: dto.email?.trim().toLowerCase() || null,
      direccion: dto.direccion?.trim() || null,
      notas: dto.notas?.trim() || null,
    });
    return await this.clienteRepository.save(cliente);
  }

  async findAll(search?: string): Promise<Cliente[]> {
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      return await this.clienteRepository.find({
        where: [
          { nombre: ILike(term) },
          { telefono: ILike(term) },
          { email: ILike(term) },
        ],
        order: { nombre: 'ASC' },
        take: 50,
      });
    }

    return await this.clienteRepository.find({
      order: { created_at: 'DESC' },
      take: 100,
    });
  }

  async findOne(id: string): Promise<Cliente> {
    const cliente = await this.clienteRepository.findOne({
      where: { id },
      relations: ['ordenes'],
    });
    if (!cliente) {
      throw new NotFoundException(`Cliente con ID '${id}' no encontrado`);
    }
    return cliente;
  }

  async update(id: string, dto: UpdateClienteDto): Promise<Cliente> {
    const cliente = await this.findOne(id);
    if (dto.nombre !== undefined) cliente.nombre = dto.nombre.trim();
    if (dto.telefono !== undefined) cliente.telefono = dto.telefono ? dto.telefono.trim() : null;
    if (dto.email !== undefined) cliente.email = dto.email ? dto.email.trim().toLowerCase() : null;
    if (dto.direccion !== undefined) cliente.direccion = dto.direccion ? dto.direccion.trim() : null;
    if (dto.notas !== undefined) cliente.notas = dto.notas ? dto.notas.trim() : null;
    return await this.clienteRepository.save(cliente);
  }
}
